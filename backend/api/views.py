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

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        return obj.creator == request.user or obj.mentor == request.user

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.author == request.user

class IsAuthenticatedOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated

class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Comment.objects.filter(project_id=self.kwargs['project_pk'])

    def perform_create(self, serializer):
        serializer.save(author=self.request.user, project_id=self.kwargs['project_pk'])

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all() # Lista de todos los usuarios
    serializer_class = UserSerializer # Indicamos los datos necesarios para un usuario con la clase serializadora
    permission_classes = [AllowAny] # Todos pueden crear un usuario

class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['interests', 'abilities', 'status']

class ProjectViewSet(viewsets.ModelViewSet):
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
        project = serializer.save(creator=self.request.user)
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
                {'detail': 'You do not have permission to update this project.'},
                status=status.HTTP_403_FORBIDDEN
            )

        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='assign-user')
    def assign_user(self, request, pk=None):
        project = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response({'error': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id, user_type=User.STUDENT)
        except User.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

        if user.projects_as_student.exclude(id=project.id).exists():
            return Response({'error': 'User is already assigned to another project.'}, status=status.HTTP_400_BAD_REQUEST)

        if project.students.count() >= 3:
            return Response({'error': 'Project already has 3 students.'}, status=status.HTTP_400_BAD_REQUEST)

        project.students.add(user)
        if project.students.count() == 3:
            project.status = 'team_complete'
            project.save()
        
        if user.status != "enrolled":
            user.status = "enrolled"
            user.save(update_fields=["status"])

        return Response({'message': f'User {user.username} assigned to project {project.name}.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='unassign-user')
    def unassign_user(self, request, pk=None):
        project = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response({'error': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.id != project.creator_id and request.user.id != (project.mentor_id or None):
            return Response({'error': 'Only the project owner or mentor can remove students.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            user = User.objects.get(id=user_id, user_type=User.STUDENT)
        except User.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        if user.id == project.creator_id:
            return Response({'error': 'Cannot remove the project creator.'}, status=status.HTTP_400_BAD_REQUEST)
        if project.mentor_id and user.id == project.mentor_id:
            return Response({'error': 'Cannot remove the project mentor.'}, status=status.HTTP_400_BAD_REQUEST)

        if not project.students.filter(id=user.id).exists():
            return Response({'error': 'User is not assigned to this project.'}, status=status.HTTP_400_BAD_REQUEST)

        project.students.remove(user)
        if project.students.count() < 3 and project.status == 'team_complete':
            project.status = 'looking_students'
            project.save()
        
        if not user.projects_as_student.exists():
            user.status = "available"
            user.save(update_fields=["status"])

        return Response({'message': f'User {user.username} removed from project {project.name}.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='assign-mentor')
    def assign_mentor(self, request, pk=None):
        project = self.get_object()
        mentor_id = request.data.get('mentor_id')

        if not mentor_id:
            return Response({'error': 'mentor_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if project.mentor is not None:
            return Response(
                {'error': 'This project already has a mentor assigned.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            mentor = User.objects.get(id=mentor_id, user_type=User.MENTOR)
        except User.DoesNotExist:
            return Response({'error': 'Mentor not found.'}, status=status.HTTP_404_NOT_FOUND)

        project.mentor = mentor
        project.save()

        return Response(
            {'message': f'Mentor {mentor.username} assigned to project {project.name}.'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='unassign-mentor')
    def unassign_mentor(self, request, pk=None):
        project = self.get_object()

        if not project.mentor:
            return Response({'error': 'This project has no assigned mentor.'}, status=status.HTTP_400_BAD_REQUEST)

        removed_mentor = project.mentor
        project.mentor = None
        project.save()

        return Response({'message': f'Mentor {removed_mentor.username} unassigned from project {project.name}.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='matched-users')
    def matched_users(self, request, pk=None):
        project = self.get_object()
        student_likes = ProjectMatchInterest.objects.filter(
            project=project,
            liked=True
        ).values_list('user_id', flat=True)

        mutual_students = UserMatchInterest.objects.filter(
            project=project,
            liked=True,
            user_id__in=student_likes
        ).select_related('user')

        users_data = []
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
        project = self.get_object()

        mentor_likes = ProjectMatchInterest.objects.filter(
            project=project,
            liked=True,
            user__user_type=User.MENTOR
        ).values_list('user_id', flat=True)

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
    queryset = Interest.objects.all()
    serializer_class = InterestSerializer
    permission_clases = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'name': ['icontains'],
    }

class AbilityViewSet(viewsets.ModelViewSet):
    queryset = Ability.objects.all()
    serializer_class = AbilitySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'name': ['icontains'],
    }

class UserMeView(APIView):
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
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

class MatchViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='suggested-projects')
    def suggested_projects(self, request):
        user = request.user
        if not user.is_student():
            return Response({'detail': 'Only students can view suggested projects.'}, status=403)

        liked = ProjectMatchInterest.objects.filter(user=user).values_list('project_id', flat=True)
        suggested = Project.objects.exclude(id__in=liked)

        serializer = ProjectSerializer(suggested, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='suggested-users')
    def suggested_users(self, request):
        user = request.user
        project_id = request.query_params.get('project_id')

        if not user.is_mentor() and not user.created_projects.exists():
            return Response({'detail': 'Only mentors or creators can view suggested users.'}, status=403)

        if not project_id:
            return Response({'detail': 'Missing project_id parameter.'}, status=400)

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'detail': 'Project not found.'}, status=404)

        if project.creator != user and project.mentor != user:
            return Response({'detail': 'You do not have access to this project.'}, status=403)

        liked_or_disliked_user_ids = UserMatchInterest.objects.filter(
            project=project
        ).values_list('user_id', flat=True)

        matched_user_ids = ProjectMatch.objects.filter(
            project=project
        ).values_list('user_id', flat=True)

        suggested = User.objects.filter(user_type='student') \
            .exclude(id__in=liked_or_disliked_user_ids) \
            .exclude(id__in=matched_user_ids) \
            .exclude(id=user.id)

        serializer = UserSerializer(suggested, many=True)
        return Response(serializer.data)


    @action(detail=False, methods=['post'], url_path='like-project')
    def like_project(self, request):
        serializer = ProjectMatchInterestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project = serializer.validated_data['project']
        liked = serializer.validated_data['liked']
        user = request.user

        print("LIKING PROJECT:", project.id, "BY USER:", user.id)

        if project.creator_id == user.id:
            return Response(
                {"detail": "Owners cannot like their own projects."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.user_type == "student" and user.projects_as_student.exists():
            return Response(
                {"detail": "Students already enrolled in a project cannot like others."},
                status=status.HTTP_400_BAD_REQUEST
            )

        interest, created = ProjectMatchInterest.objects.update_or_create(
            user=user,
            project=project,
            defaults={'liked': liked}
        )

        matched = False
        match_with = None

        if liked:
            reciprocal = UserMatchInterest.objects.filter(
                project=project,
                user=user,
                liked=True
            ).exists()

            print("RECIPROCAL?", reciprocal)

            if reciprocal:
                ProjectMatch.objects.get_or_create(user=user, project=project)
                matched = True

                recipient = project.mentor or project.creator
                if recipient:
                    Notification.objects.create(
                        recipient=recipient,
                        message=f"¡Hiciste match con '{user.username}' en el proyecto '{project.name}'!",
                        related_project=project
                    )
                    match_with = recipient.username

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
        serializer = ProjectMatchInterestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        print('SERIALIZER DATA:', serializer.validated_data)

        project = serializer.validated_data['project']
        liked = serializer.validated_data['liked']
        user = request.user
        print("Current user:", user, "| Authenticated:", user.is_authenticated)
        print(f'Disliked project: {project} - {liked} - {user}')

        ProjectMatchInterest.objects.update_or_create(
            user=user,
            project=project,
            defaults={'liked': liked}
        )

        return Response({'status': 'project disliked'})

    @action(detail=False, methods=['post'], url_path='like-user', permission_classes=[IsAuthenticated])
    def like_user(self, request):
        serializer = UserMatchInterestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_to_like = serializer.validated_data['user']
        project = serializer.validated_data['project']
        liked = serializer.validated_data['liked']
        acting_user = request.user


        if not project:
            return Response({'detail': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)

        if acting_user != project.creator and acting_user != project.mentor:
            return Response({'detail': 'You do not have permission for this project.'}, status=status.HTTP_403_FORBIDDEN)

        if user_to_like == acting_user:
            return Response({'detail': 'You cannot like yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        if project.students.filter(id=user_to_like.id).exists() or project.mentor_id == user_to_like.id:
            return Response({'detail': 'User is already part of this project.'}, status=status.HTTP_400_BAD_REQUEST)

        interest, created = UserMatchInterest.objects.update_or_create(
            project=project,
            user=user_to_like,
            defaults={'liked': liked}
        )

        matched = False
        match_with = None

        if liked:
            reciprocal = ProjectMatchInterest.objects.filter(
                user=user_to_like,
                project=project,
                liked=True
            ).exists()

            print("RECIPROCAL?", reciprocal)

            if reciprocal:
                ProjectMatch.objects.get_or_create(user=user_to_like, project=project)
                matched = True
                match_with = user_to_like.username

                Notification.objects.create(
                    recipient=user_to_like,
                    message=f"¡Hiciste match con el proyecto '{project.name}'!",
                    related_project=project
                )

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
        serializer = UserMatchInterestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_to_dislike = serializer.validated_data['user']
        project = serializer.validated_data['project']
        liked = serializer.validated_data['liked']

        if not project:
            return Response({'detail': 'Project not found.'}, status=404)

        acting_user = request.user

        if acting_user != project.creator and acting_user != project.mentor:
            return Response({'detail': 'You do not have permission for this project.'}, status=403)

        interest, created = UserMatchInterest.objects.update_or_create(
            project=project,
            user=user_to_dislike,
            defaults={'liked': liked}
        )

        return Response({'status': 'user disliked'})
    
    @action(detail=False, methods=['get'], url_path='ai-suggested-users')
    def ai_suggested_users(self, request):
        user = request.user
        project_id = request.query_params.get('project_id')
        user_type = request.query_params.get('user_type', 'student')

        if not project_id:
            return Response({'detail': 'Missing project_id parameter.'}, status=status.HTTP_400_BAD_REQUEST)

        project = get_object_or_404(Project, id=project_id)

        if project.creator != user and project.mentor != user:
            return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        if user_type == "mentor" and project.mentor_id:
            return Response([], status=status.HTTP_200_OK)

        if user_type == "student":
            users = get_similar_students_for_project(project)
        elif user_type == "mentor":
            users = get_similar_mentors_for_project(project)
        else:
            return Response({'detail': 'Invalid user_type.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(UserSerializer(users, many=True).data)

    @action(detail=False, methods=['get'], url_path='ai-suggested-projects')
    def ai_suggested_projects(self, request):
        user = request.user

        if not (user.is_student() or user.is_mentor()):
            return Response(
                {'detail': 'Only students and mentors can get project suggestions.'},
                status=403
            )

        projects = get_similar_projects_for_user(user)

        if user.is_mentor():
            projects = [p for p in projects if p.mentor is None]

        serializer = ProjectSerializer(
            projects,
            many=True,
            context={"request": request}
        )
        return Response(serializer.data)




class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        try:
            notification = self.get_object()
            notification.is_read = True
            notification.save()
            return Response({'status': 'marked as read'})
        except:
            return Response({'error': 'Notification not found'}, status=404)
