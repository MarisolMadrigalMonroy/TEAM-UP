from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import render
from .models import Ability, Comment, Interest, Project, User, Category, Notification
from rest_framework import generics, viewsets, status, permissions
from .serializers import AbilitySerializer, CommentSerializer, InterestSerializer, ProjectSerializer, UserSerializer, UserProfileSerializer, CategorySerializer
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly, BasePermission, SAFE_METHODS
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .utils.embedding import get_similar_students_for_project, get_similar_mentors_for_project,  get_similar_projects_for_user
from pgvector.django import VectorField
from django.db.models import F
from django.shortcuts import get_object_or_404
from pgvector.django import L2Distance

from .models import Project, User, ProjectMatchInterest, UserMatchInterest, ProjectMatch
from .serializers import ProjectSerializer, ProjectMatchInterestSerializer, UserMatchInterestSerializer, NotificationSerializer

class IsProjectCreatorOrMentor(permissions.BasePermission):
    '''
    Clase auxiliar para conocer si un usuario es el creador o asesor de un proyecto.
    '''

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        return obj.creator == request.user or obj.mentor == request.user

class IsAuthenticatedOrReadOnly(BasePermission):
    '''
    Clase auxiliar para validar si el usuario está autenticado.
    '''
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated

class CommentViewSet(viewsets.ModelViewSet):
    '''
    Clase que agrupa la lógica de la API para comentarios.

    Los verbos Http (GET, POST, PUT, DELETE) están incluidos y son manejados
    por Django REST Framework.
    '''
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Comment.objects.filter(project_id=self.kwargs['project_pk'])

    def perform_create(self, serializer):
        serializer.save(author=self.request.user, project_id=self.kwargs['project_pk'])

class CreateUserView(generics.CreateAPIView):
    '''
    Clase que representa una vista para crear un usuario.

    Sólo incluye el verbo Http POST, ya que no queremos el resto de verbos
    durante la creación de un usuario por motivos de seguridad.
    '''
    queryset = User.objects.all() # Lista de todos los usuarios
    serializer_class = UserSerializer # Indicamos los datos necesarios para un usuario con la clase serializadora
    permission_classes = [AllowAny] # Todos pueden crear un usuario

class ProjectViewSet(viewsets.ModelViewSet):
    '''
    Clase que agrupa la lógica de la API para proyectos.

    Los verbos Http (GET, POST, PUT, DELETE) están incluidos y son manejados
    por Django REST Framework.
    '''
    queryset = Project.objects.all().prefetch_related('categories', 'required_abilities', 'students')
    serializer_class = ProjectSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        search = params.get('search')
        status_param = params.get('status')
        category_ids = params.getlist('category')
        ability_ids = params.getlist('ability')

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )

        if category_ids:
            queryset = queryset.filter(categories__id__in=category_ids)

        if ability_ids:
            queryset = queryset.filter(required_abilities__id__in=ability_ids)

        if status_param:
            queryset = queryset.filter(status=status_param)

        return queryset.distinct()

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsProjectCreatorOrMentor()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        project = serializer.save(creator=self.request.user) # Creamos el proyecto en la base de datos
        user = self.request.user

        if user.is_authenticated:
            if user.is_mentor():
                project.mentor = user
            elif user.is_student():
                project.students.add(user)
            project.save()
    
    def update(self, request, *args, **kwargs):
        project = self.get_object()

        if request.user.id != project.creator_id and request.user.id != (project.mentor_id or None):
            return Response(
                {'detail': 'No cuentas con el permiso para actualizar este proyecto.'},
                status=status.HTTP_403_FORBIDDEN
            )

        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='assign-user')
    def assign_user(self, request, pk=None):
        '''
        endpoint específico para asignar un usuario a un proyecto.

        detail=True significa que la url debe incluir el proyecto especifico al cual
        se quiere agregar el usuario.
        '''
        project = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response({'error': 'se requiere user_id.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id, user_type=User.STUDENT)
        except User.DoesNotExist:
            return Response({'error': 'No se encontró el usuario.'}, status=status.HTTP_404_NOT_FOUND)

        if user.projects_as_student.exclude(id=project.id).exists():
            return Response({'error': 'El usuario ya está asignado a otro proyecto.'}, status=status.HTTP_400_BAD_REQUEST)

        if project.students.count() >= 3:
            return Response({'error': 'El proyecto ya cuenta con 3 estudiantes.'}, status=status.HTTP_400_BAD_REQUEST)

        project.students.add(user)
        if project.students.count() == 3:
            project.status = 'team_complete'
            project.save()
        
        if user.status != "enrolled":
            user.status = "enrolled"
            user.save(update_fields=["status"])

        return Response({'message': f'Usuario {user.username} asignado al proyecto {project.name}.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='unassign-user')
    def unassign_user(self, request, pk=None):
        '''
        endpoint específico para remover un usuario de un proyecto.

        detail=True significa que la url debe incluir el proyecto especifico del cual
        se quiere remover el usuario.
        '''
        project = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response({'error': 'se requiere user_id.'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.id != project.creator_id and request.user.id != (project.mentor_id or None):
            return Response({'error': 'Sólo el creador del proyecto o el asesor pueden remover estudiantes.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            user = User.objects.get(id=user_id, user_type=User.STUDENT)
        except User.DoesNotExist:
            return Response({'error': 'No se encontró el estudiante.'}, status=status.HTTP_404_NOT_FOUND)
        
        if user.id == project.creator_id:
            return Response({'error': 'No se puede remover al creador del proyecto.'}, status=status.HTTP_400_BAD_REQUEST)
        if project.mentor_id and user.id == project.mentor_id:
            return Response({'error': 'No se puede remover al asesor del proyecto.'}, status=status.HTTP_400_BAD_REQUEST)

        if not project.students.filter(id=user.id).exists():
            return Response({'error': 'El usuario no está asignado a este proyecto.'}, status=status.HTTP_400_BAD_REQUEST)

        project.students.remove(user)
        if project.students.count() < 3 and project.status == 'team_complete':
            project.status = 'looking_students'
            project.save()
        
        if not user.projects_as_student.exists():
            user.status = "available"
            user.save(update_fields=["status"])

        return Response({'message': f'Usuario {user.username} removido del proyecto {project.name}.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='assign-mentor')
    def assign_mentor(self, request, pk=None):
        '''
        endpoint específico para asignar un asesor a un proyecto.

        detail=True significa que la url debe incluir el proyecto especifico al cual
        se quiere asignar el asesor.
        '''
        project = self.get_object()
        mentor_id = request.data.get('mentor_id')

        if not mentor_id:
            return Response({'error': 'Se requiere mentor_id.'}, status=status.HTTP_400_BAD_REQUEST)

        if project.mentor is not None:
            return Response(
                {'error': 'Este proyecto ya cuenta con un asesor.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            mentor = User.objects.get(id=mentor_id, user_type=User.MENTOR)
        except User.DoesNotExist:
            return Response({'error': 'Asesor no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        project.mentor = mentor
        project.save()

        return Response(
            {'message': f'Asesor {mentor.username} asignado al proyecto {project.name}.'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='unassign-mentor')
    def unassign_mentor(self, request, pk=None):
        '''
        endpoint específico para remover un asesor de un proyecto.

        detail=True significa que la url debe incluir el proyecto especifico del cual
        se quiere remover el asesor.
        '''
        project = self.get_object()

        if not project.mentor:
            return Response({'error': 'Este proyecto no tiene un asesor.'}, status=status.HTTP_400_BAD_REQUEST)

        removed_mentor = project.mentor
        project.mentor = None
        project.save()

        return Response({'message': f'Asesor {removed_mentor.username} removido del proyecto {project.name}.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='matched-users')
    def matched_users(self, request, pk=None):
        '''
        endpoint específico para obtener los usuarios que hicieron match con el proyecto.

        detail=True significa que la url debe incluir el proyecto especifico del cual
        se quieren obtener usuarios con un match.
        '''
        project = self.get_object()

        # Usuarios a los que les gusta el proyecto
        student_likes = ProjectMatchInterest.objects.filter(
            project=project,
            liked=True
        ).values_list('user_id', flat=True)

        # Likes mutuos. Usuarios a los que se les dió like desde el proyecto y que son parte de la lista anterior
        mutual_students = UserMatchInterest.objects.filter(
            project=project,
            liked=True,
            user_id__in=student_likes
        ).select_related('user')

        users_data = []
        # Para cada usuario con match se incluyen sus datos y si ya es parte de este proyecto o de otro
        for umi in mutual_students:
            user = umi.user
            assigned = False
            already_enrolled = False
            if project.students.filter(id=user.id).exists():
                assigned = True
            elif user.projects_as_student.exclude(id=project.id).exists():
                already_enrolled = True
            print(f'{assigned} {already_enrolled}')
            users_data.append({
                'id': user.id,
                'username': user.username,
                'bio': getattr(user, 'bio', ''),
                'status': getattr(user, 'status', ''),
                'assigned': assigned,
                'already_enrolled_in_other_project': already_enrolled
            })

        return Response(users_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='matched-mentors')
    def matched_mentors(self, request, pk=None):
        '''
        endpoint específico para obtener los asesores que hicieron match con el proyecto.

        detail=True significa que la url debe incluir el proyecto especifico del cual
        se quieren obtener asesores con un match.
        '''
        project = self.get_object()

        # Asesores a los que les gusta el proyecto
        mentor_likes = ProjectMatchInterest.objects.filter(
            project=project,
            liked=True,
            user__user_type=User.MENTOR
        ).values_list('user_id', flat=True)

        # Likes mutuos. Asesores a los que se les dió like desde el proyecto y que son parte de la lista anterior
        mutual_mentors = UserMatchInterest.objects.filter(
            project=project,
            liked=True,
            user_id__in=mentor_likes
        ).select_related('user')

        mentors_data = []
        for umi in mutual_mentors:
            mentor = umi.user
            assigned = False

            if project.mentor and project.mentor.id == mentor.id:
                assigned = True

            mentors_data.append({
                'id': mentor.id,
                'username': mentor.username,
                'bio': getattr(mentor, 'bio', ''),
                'status': getattr(mentor, 'status', ''),
                'assigned': assigned,
            })

        return Response(mentors_data, status=status.HTTP_200_OK)
    
class InterestViewSet(viewsets.ModelViewSet):
    '''
    Clase que agrupa la lógica de la API para intereses.

    Los verbos Http (GET, POST, PUT, DELETE) están incluidos y son manejados
    por Django REST Framework.
    '''
    queryset = Interest.objects.all()
    serializer_class = InterestSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    # Permite buscar intereses por nombre
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'name': ['icontains'],
    }

class AbilityViewSet(viewsets.ModelViewSet):
    '''
    Clase que agrupa la lógica de la API para habilidades.

    Los verbos Http (GET, POST, PUT, DELETE) están incluidos y son manejados
    por Django REST Framework.
    '''
    queryset = Ability.objects.all()
    serializer_class = AbilitySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    # Permite buscar habilidades por nombre
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'name': ['icontains'],
    }

class UserMeView(APIView):
    '''
    Clase que representa la sesión del usuario autenticado. Se utiliza para el perfil del usuario.
    '''
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CategoryViewSet(viewsets.ModelViewSet):
    '''
    Clase que agrupa la lógica de la API para habilidades.

    Los verbos Http (GET, POST, PUT, DELETE) están incluidos y son manejados
    por Django REST Framework.
    '''
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

class MatchViewSet(viewsets.ViewSet):
    '''
    Clase que representa el comportamiento de emparejamiento.
    No está asociada a un modelo en específico.

    ViewSet permite crear rutas para endpoints e implementar acciones con @action.
    '''
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='like-project')
    def like_project(self, request):
        '''
        endpoint específico para indicar que a un usuario le da me gusta a un proyecto.

        detail=False significa que la url no debe incluir el proyecto especifico
        al cual se le da me gusta.
        '''
        serializer = ProjectMatchInterestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project = serializer.validated_data['project']
        liked = serializer.validated_data['liked']
        user = request.user

        if project.creator_id == user.id:
            return Response(
                {"detail": "Los creadores no pueden dar like a sus proyectos."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.user_type == "student" and user.projects_as_student.exists():
            return Response(
                {"detail": "Estudiantes registrados en un proyecto no pueden darle me gusta a otros proyectos."},
                status=status.HTTP_400_BAD_REQUEST
            )

        interest, created = ProjectMatchInterest.objects.update_or_create(
            user=user,
            project=project,
            defaults={'liked': liked}
        )

        matched = False
        match_with = None

        # Si el usuario le dio me gusta al proyecto
        if liked:
            reciprocal = UserMatchInterest.objects.filter(
                project=project,
                user=user,
                liked=True
            ).exists()

            # Si desde el proyecto se le había dado me gusta al usuario
            if reciprocal:
                ProjectMatch.objects.get_or_create(user=user, project=project)
                matched = True

                # Obtenemos el asesor o creador a quien se le dará la notificación
                recipient = project.mentor or project.creator
                if recipient:
                    # Se crea la notificación
                    Notification.objects.create(
                        recipient=recipient,
                        message=f"¡Hiciste match con '{user.username}' en el proyecto '{project.name}'!",
                        related_project=project
                    )
                    match_with = recipient.username

                # Se crea la notificación para el usuario
                Notification.objects.create(
                    recipient=user,
                    message=f"¡Hiciste match con el proyecto '{project.name}'!",
                    related_project=project
                )

        return Response({
            **ProjectMatchInterestSerializer(interest).data,
            'matched': matched,
            'match_with': match_with,
            'project_id': project.id
        }, status=status.HTTP_200_OK)


    @action(detail=False, methods=['post'], url_path='dislike-project')
    def dislike_project(self, request):
        '''
        endpoint específico para indicar que a un usuario le da no me gusta a un proyecto.

        detail=False significa que la url no debe incluir el proyecto especifico
        al cual se le da no me gusta.
        '''
        serializer = ProjectMatchInterestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project = serializer.validated_data['project']
        liked = serializer.validated_data['liked']
        user = request.user

        ProjectMatchInterest.objects.update_or_create(
            user=user,
            project=project,
            defaults={'liked': liked}
        )

        return Response({'status': 'Se dió no me gusta al proyecto'})

    @action(detail=False, methods=['post'], url_path='like-user')
    def like_user(self, request):
        '''
        endpoint específico para indicar que desde un proyecto se le da me gusta a un usuario.

        detail=False significa que la url no debe incluir el usuario especifico
        al cual se le da me gusta.
        '''
        serializer = UserMatchInterestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_to_like = serializer.validated_data['user']
        project = serializer.validated_data['project']
        liked = serializer.validated_data['liked']
        acting_user = request.user


        if not project:
            return Response({'detail': 'No se encontró el proyecto.'}, status=status.HTTP_404_NOT_FOUND)

        if acting_user != project.creator and acting_user != project.mentor:
            return Response({'detail': 'No cuentas con permisos para este proyecto.'}, status=status.HTTP_403_FORBIDDEN)

        if user_to_like == acting_user:
            return Response({'detail': 'No puedes dar me gusta a ti mismo.'}, status=status.HTTP_400_BAD_REQUEST)

        if project.students.filter(id=user_to_like.id).exists() or project.mentor_id == user_to_like.id:
            return Response({'detail': 'El usuario ya es parte de este proyecto.'}, status=status.HTTP_400_BAD_REQUEST)

        interest, created = UserMatchInterest.objects.update_or_create(
            project=project,
            user=user_to_like,
            defaults={'liked': liked}
        )

        matched = False
        match_with = None

        # Si desde el proyecto se le dió me gusta al usuario
        if liked:
            reciprocal = ProjectMatchInterest.objects.filter(
                user=user_to_like,
                project=project,
                liked=True
            ).exists()

            if reciprocal:
                ProjectMatch.objects.get_or_create(user=user_to_like, project=project)
                matched = True
                match_with = user_to_like.username

                # Se crea la notificación para el usuario
                Notification.objects.create(
                    recipient=user_to_like,
                    message=f"¡Hiciste match con el proyecto '{project.name}'!",
                    related_project=project
                )

                # Se crea la notificación para el creador o asesor del proyecto
                Notification.objects.create(
                    recipient=acting_user,
                    message=f"¡Hiciste match con '{user_to_like.username}' en el proyecto '{project.name}'!",
                    related_project=project
                )

        return Response({
            **UserMatchInterestSerializer(interest).data,
            'matched': matched,
            'match_with': match_with,
            'project_id': project.id
        }, status=status.HTTP_200_OK)


    @action(detail=False, methods=['post'], url_path='dislike-user')
    def dislike_user(self, request):
        '''
        endpoint específico para indicar que desde un proyecto se le da no me gusta a un usuario.

        detail=False significa que la url no debe incluir el usuario especifico
        al cual se le da no me gusta.
        '''
        serializer = UserMatchInterestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_to_dislike = serializer.validated_data['user']
        project = serializer.validated_data['project']
        liked = serializer.validated_data['liked']

        if not project:
            return Response({'detail': 'Proyecto no encontrado.'}, status=404)

        acting_user = request.user

        if acting_user != project.creator and acting_user != project.mentor:
            return Response({'detail': 'No cuentas con permisos para este proyecto.'}, status=403)

        interest, created = UserMatchInterest.objects.update_or_create(
            project=project,
            user=user_to_dislike,
            defaults={'liked': liked}
        )

        return Response({'status': 'Se dió no me gusta al proyecto'})
    
    @action(detail=False, methods=['get'], url_path='ai-suggested-users')
    def ai_suggested_users(self, request):
        '''
        endpoint específico para obtener sugerencias de usuarios con inteligencia artificial.

        detail=False significa que la url no debe incluir el proyecto especifico
        al cual se le sugieren usuarios.
        '''
        user = request.user
        project_id = request.query_params.get('project_id')
        user_type = request.query_params.get('user_type', 'student')

        if not project_id:
            return Response({'detail': 'Falta el parámetro project_id.'}, status=status.HTTP_400_BAD_REQUEST)

        project = get_object_or_404(Project, id=project_id)

        if project.creator != user and project.mentor != user:
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        if user_type == "mentor" and project.mentor_id:
            return Response([], status=status.HTTP_200_OK)

        if user_type == "student":
            # Obtenemos estudiantes afines al proyecto
            users = get_similar_students_for_project(project)
        elif user_type == "mentor":
            # Obtenemos asesores afines al proyecto
            users = get_similar_mentors_for_project(project)
        else:
            return Response({'detail': 'user_type no válido.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(UserSerializer(users, many=True).data)

    @action(detail=False, methods=['get'], url_path='ai-suggested-projects')
    def ai_suggested_projects(self, request):
        '''
        endpoint específico para obtener sugerencias de proyectos con inteligencia artificial.

        detail=False significa que la url no debe incluir el usuario especifico
        al cual se le sugieren proyectos.
        '''
        user = request.user

        if not (user.is_student() or user.is_mentor()):
            return Response(
                {'detail': 'Sólo estudiantes y asesores pueden recibir sugerencias.'},
                status=403
            )

        # Obtenemos proyectos afines al usuario
        projects = get_similar_projects_for_user(user)

        # Si el usuario es asesor, se le muestran proyectos sin asesor
        if user.is_mentor():
            projects = [p for p in projects if p.mentor is None]

        serializer = ProjectSerializer(
            projects,
            many=True,
            context={"request": request}
        )
        return Response(serializer.data)

class NotificationViewSet(viewsets.ModelViewSet):
    '''
    Clase que agrupa la lógica de la API para notificaciones.

    Los verbos Http (GET, POST, PUT, DELETE) están incluidos y son manejados
    por Django REST Framework.
    '''
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        '''
        endpoint específico para marcar una notificación como leída.

        detail=True significa que la url debe incluir la notificación especifica
        que será marcada como leída.
        '''
        try:
            notification = self.get_object()
            notification.is_read = True
            notification.save()
            return Response({'status': 'marcada como leída'})
        except:
            return Response({'error': 'Notificación no encontrada'}, status=404)
