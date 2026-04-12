from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import render
from .models import Habilidad, Comentario, Interes, Proyecto, User, Categoria, Notificacion, InteresSobreProyecto, InteresSobreUsuario, Match
from rest_framework import generics, viewsets, status, permissions
from .serializers import HabilidadSerializer, ComentarioSerializer, InteresSerializer, ProyectoSerializer, UserSerializer, PerfilUsuarioSerializer, CategoriaSerializer, InteresSobreProyectoSerializer, InteresSobreUsuarioSerializer, NotificacionSerializer, PerfilPublicoSerializer
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
from .utils.embedding import obtener_estudiantes_similares_para_proyecto, obtener_asesores_similares_para_proyecto,  obtener_proyectos_similares_para_usuario
from pgvector.django import VectorField
from django.db.models import F
from django.shortcuts import get_object_or_404
from pgvector.django import L2Distance

class EsCreadorDeProyectoOAsesor(permissions.BasePermission):
    '''
    Clase auxiliar para conocer si un usuario es el creador o asesor de un proyecto.
    '''

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        return obj.creador == request.user or obj.asesor == request.user

class IsAuthenticatedOrReadOnly(BasePermission):
    '''
    Clase auxiliar para validar si el usuario está autenticado.
    '''

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated

class ComentarioViewSet(viewsets.ModelViewSet):
    '''
    Clase que agrupa la lógica de la API para comentarios.

    Los verbos Http (GET, POST, PUT, DELETE) están incluidos y son manejados
    por Django REST Framework.
    '''

    serializer_class = ComentarioSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Comentario.objects.filter(proyecto_id=self.kwargs['proyecto_pk'])

    def perform_create(self, serializer):
        serializer.save(autor=self.request.user, proyecto_id=self.kwargs['proyecto_pk'])

class CreateUserView(generics.CreateAPIView):
    '''
    Clase que representa una vista para crear un usuario.

    Sólo incluye el verbo Http POST, ya que no queremos el resto de verbos
    durante la creación de un usuario por motivos de seguridad.
    '''

    queryset = User.objects.all() # Lista de todos los usuarios
    serializer_class = UserSerializer # Indicamos los datos necesarios para un usuario con la clase serializadora
    permission_classes = [AllowAny] # Todos pueden crear un usuario

class ProyectoViewSet(viewsets.ModelViewSet):
    '''
    Clase que agrupa la lógica de la API para proyectos.

    Los verbos Http (GET, POST, PUT, DELETE) están incluidos y son manejados
    por Django REST Framework.
    '''

    queryset = Proyecto.objects.all().prefetch_related('categorias', 'habilidades_requeridas', 'estudiantes')
    serializer_class = ProyectoSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        busqueda = params.get('busqueda')
        estado_param = params.get('estado')
        categoria_ids = params.getlist('categoria')
        habilidad_ids = params.getlist('habilidad')

        if busqueda:
            queryset = queryset.filter(
                Q(nombre__unaccent__icontains=busqueda) |
                Q(descripcion__unaccent__icontains=busqueda)
            )

        if categoria_ids:
            queryset = queryset.filter(categorias__id__in=categoria_ids)

        if habilidad_ids:
            queryset = queryset.filter(habilidades_requeridas__id__in=habilidad_ids)

        if estado_param:
            queryset = queryset.filter(estado=estado_param)

        return queryset.distinct()

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), EsCreadorDeProyectoOAsesor()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        proyecto = serializer.save(creador=self.request.user) # Creamos el proyecto en la base de datos
        usuario = self.request.user

        if usuario.is_authenticated:
            if usuario.es_asesor():
                proyecto.asesor = usuario
            elif usuario.es_estudiante():
                proyecto.estudiantes.add(usuario)
            if usuario.estado != "registrado":
                usuario.estado = "registrado"
                usuario.save(update_fields=["estado"])
            proyecto.save()
    
    def update(self, request, *args, **kwargs):
        proyecto = self.get_object()

        if request.user.id != proyecto.creador_id and request.user.id != (proyecto.asesor_id or None):
            return Response(
                {'detail': 'No cuentas con el permiso para actualizar este proyecto.'},
                status=status.HTTP_403_FORBIDDEN
            )

        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='asignar-usuario')
    def asignar_usuario(self, request, pk=None):
        '''
        endpoint específico para asignar un usuario a un proyecto.

        detail=True significa que la url debe incluir el proyecto especifico al cual
        se quiere agregar el usuario.
        '''

        proyecto = self.get_object()
        usuario_id = request.data.get('usuario_id')

        if not usuario_id:
            return Response({'error': 'se requiere usuario_id.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            usuario = User.objects.get(id=usuario_id, tipo_usuario=User.ESTUDIANTE)
        except User.DoesNotExist:
            return Response({'error': 'No se encontró el usuario.'}, status=status.HTTP_404_NOT_FOUND)

        if usuario.proyectos_como_estudiante.exclude(id=proyecto.id).exists():
            return Response({'error': 'El usuario ya está asignado a otro proyecto.'}, status=status.HTTP_400_BAD_REQUEST)

        if proyecto.estudiantes.count() >= 3:
            return Response({'error': 'El proyecto ya cuenta con 3 estudiantes.'}, status=status.HTTP_400_BAD_REQUEST)

        proyecto.estudiantes.add(usuario)
        if proyecto.estudiantes.count() == 3:
            proyecto.estado = 'equipo_completo'
            proyecto.save()
        
        if usuario.estado != "registrado":
            usuario.estado = "registrado"
            usuario.save(update_fields=["estado"])

        return Response({'message': f'Usuario {usuario.username} asignado al proyecto {proyecto.nombre}.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='remover-usuario')
    def remover_usuario(self, request, pk=None):
        '''
        endpoint específico para remover un usuario de un proyecto.

        detail=True significa que la url debe incluir el proyecto especifico del cual
        se quiere remover el usuario.
        '''

        proyecto = self.get_object()
        usuario_id = request.data.get('usuario_id')

        if not usuario_id:
            return Response({'error': 'se requiere usuario_id.'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.id != proyecto.creador_id and request.user.id != (proyecto.asesor_id or None):
            return Response({'error': 'Sólo el creador del proyecto o el asesor pueden remover estudiantes.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            usuario = User.objects.get(id=usuario_id, tipo_usuario=User.ESTUDIANTE)
        except User.DoesNotExist:
            return Response({'error': 'No se encontró el estudiante.'}, status=status.HTTP_404_NOT_FOUND)
        
        if usuario.id == proyecto.creador_id:
            return Response({'error': 'No se puede remover al creador del proyecto.'}, status=status.HTTP_400_BAD_REQUEST)
        if proyecto.asesor_id and usuario.id == proyecto.asesor_id:
            return Response({'error': 'No se puede remover al asesor del proyecto.'}, status=status.HTTP_400_BAD_REQUEST)

        if not proyecto.estudiantes.filter(id=usuario.id).exists():
            return Response({'error': 'El usuario no está asignado a este proyecto.'}, status=status.HTTP_400_BAD_REQUEST)

        proyecto.estudiantes.remove(usuario)
        if proyecto.estudiantes.count() < 3 and proyecto.estado == 'equipo_completo':
            proyecto.estado = 'buscando_estudiantes'
            proyecto.save()
        
        if not usuario.proyectos_como_estudiante.exists():
            usuario.estado = "disponible"
            usuario.save(update_fields=["estado"])

        return Response({'message': f'Usuario {usuario.username} removido del proyecto {proyecto.nombre}.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='asignar-asesor')
    def asignar_asesor(self, request, pk=None):
        '''
        endpoint específico para asignar un asesor a un proyecto.

        detail=True significa que la url debe incluir el proyecto especifico al cual
        se quiere asignar el asesor.
        '''

        proyecto = self.get_object()
        asesor_id = request.data.get('asesor_id')

        if not asesor_id:
            return Response({'error': 'Se requiere asesor_id.'}, status=status.HTTP_400_BAD_REQUEST)

        if proyecto.asesor is not None:
            return Response(
                {'error': 'Este proyecto ya cuenta con un asesor.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            asesor = User.objects.get(id=asesor_id, tipo_usuario=User.ASESOR)
        except User.DoesNotExist:
            return Response({'error': 'Asesor no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        proyecto.asesor = asesor
        proyecto.save()

        if asesor.estado != "registrado":
            asesor.estado = "registrado"
            asesor.save(update_fields=["estado"])

        return Response(
            {'message': f'Asesor {asesor.username} asignado al proyecto {proyecto.nombre}.'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='remover-asesor')
    def remover_asesor(self, request, pk=None):
        '''
        endpoint específico para remover un asesor de un proyecto.

        detail=True significa que la url debe incluir el proyecto especifico del cual
        se quiere remover el asesor.
        '''

        proyecto = self.get_object()

        if not proyecto.asesor:
            return Response({'error': 'Este proyecto no tiene un asesor.'}, status=status.HTTP_400_BAD_REQUEST)

        asesor_removido = proyecto.asesor
        proyecto.asesor = None
        proyecto.save()

        return Response({'message': f'Asesor {asesor_removido.username} removido del proyecto {proyecto.nombre}.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='usuarios-emparejados')
    def usuarios_emparejados(self, request, pk=None):
        '''
        endpoint específico para obtener los usuarios que hicieron match con el proyecto.

        detail=True significa que la url debe incluir el proyecto especifico del cual
        se quieren obtener usuarios con un match.
        '''

        proyecto = self.get_object()

        # Usuarios a los que les gusta el proyecto
        likes_estudiante = InteresSobreProyecto.objects.filter(
            proyecto=proyecto,
            gustado=True
        ).values_list('usuario_id', flat=True)

        # Likes mutuos. Usuarios a los que se les dió like desde el proyecto y que son parte de la lista anterior
        estudiantes_mutuos = InteresSobreUsuario.objects.filter(
            proyecto=proyecto,
            gustado=True,
            usuario_id__in=likes_estudiante
        ).select_related('usuario')

        datos_usuarios = []
        # Para cada usuario con match se incluyen sus datos y si ya es parte de este proyecto o de otro
        for umi in estudiantes_mutuos:
            usuario = umi.usuario
            asignado = False
            registrado_previamente = False
            if proyecto.estudiantes.filter(id=usuario.id).exists():
                asignado = True
            elif usuario.proyectos_como_estudiante.exclude(id=proyecto.id).exists():
                registrado_previamente = True

            datos_usuarios.append({
                'id': usuario.id,
                'username': usuario.username,
                'bio': getattr(usuario, 'bio', ''),
                'estado': getattr(usuario, 'estado', ''),
                'asignado': asignado,
                'registrado_previamente_en_otro_proyecto': registrado_previamente,
                'tipo_usuario': usuario.tipo_usuario
            })

        return Response(datos_usuarios, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='asesores-emparejados')
    def asesores_emparejados(self, request, pk=None):
        '''
        endpoint específico para obtener los asesores que hicieron match con el proyecto.

        detail=True significa que la url debe incluir el proyecto especifico del cual
        se quieren obtener asesores con un match.
        '''

        proyecto = self.get_object()

        # Asesores a los que les gusta el proyecto
        likes_asesor = InteresSobreProyecto.objects.filter(
            proyecto=proyecto,
            gustado=True,
            usuario__tipo_usuario=User.ASESOR
        ).values_list('usuario_id', flat=True)

        # Likes mutuos. Asesores a los que se les dió like desde el proyecto y que son parte de la lista anterior
        asesores_mutuos = InteresSobreUsuario.objects.filter(
            proyecto=proyecto,
            gustado=True,
            usuario_id__in=likes_asesor
        ).select_related('usuario')

        datos_asesores = []
        for umi in asesores_mutuos:
            asesor = umi.usuario
            asignado = False

            if proyecto.asesor and proyecto.asesor.id == asesor.id:
                asignado = True

            datos_asesores.append({
                'id': asesor.id,
                'username': asesor.username,
                'bio': getattr(asesor, 'bio', ''),
                'estado': getattr(asesor, 'estado', ''),
                'asignado': asignado,
                'tipo_usuario': asesor.tipo_usuario
            })

        return Response(datos_asesores, status=status.HTTP_200_OK)
    
class InteresViewSet(viewsets.ModelViewSet):
    '''
    Clase que agrupa la lógica de la API para intereses.

    Los verbos Http (GET, POST, PUT, DELETE) están incluidos y son manejados
    por Django REST Framework.
    '''

    queryset = Interes.objects.all()
    serializer_class = InteresSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    # Permite buscar intereses por nombre
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'nombre': ['icontains'],
    }

class HabilidadViewSet(viewsets.ModelViewSet):
    '''
    Clase que agrupa la lógica de la API para habilidades.

    Los verbos Http (GET, POST, PUT, DELETE) están incluidos y son manejados
    por Django REST Framework.
    '''

    queryset = Habilidad.objects.all()
    serializer_class = HabilidadSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    # Permite buscar habilidades por nombre
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'nombre': ['icontains'],
    }

class UserMeView(APIView):
    '''
    Clase que representa la sesión del usuario autenticado. Se utiliza para el perfil del usuario.
    '''

    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = PerfilUsuarioSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = PerfilUsuarioSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CategoriaViewSet(viewsets.ModelViewSet):
    '''
    Clase que agrupa la lógica de la API para categorias.

    Los verbos Http (GET, POST, PUT, DELETE) están incluidos y son manejados
    por Django REST Framework.
    '''

    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [AllowAny]

class MatchViewSet(viewsets.ViewSet):
    '''
    Clase que representa el comportamiento de emparejamiento.
    No está asociada a un modelo en específico.

    ViewSet permite crear rutas para endpoints e implementar acciones con @action.
    '''

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='like-proyecto')
    def like_proyecto(self, request):
        '''
        endpoint específico para indicar que a un usuario le da me gusta a un proyecto.

        detail=False significa que la url no debe incluir el proyecto especifico
        al cual se le da me gusta.
        '''

        serializer = InteresSobreProyectoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        proyecto = serializer.validated_data['proyecto']
        gustado = serializer.validated_data['gustado']
        usuario = request.user

        if proyecto.creador_id == usuario.id:
            return Response(
                {"detail": "Los creadores no pueden dar like a sus proyectos."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if usuario.tipo_usuario == "estudiante" and usuario.proyectos_como_estudiante.exists():
            return Response(
                {"detail": "Estudiantes registrados en un proyecto no pueden darle me gusta a otros proyectos."},
                status=status.HTTP_400_BAD_REQUEST
            )

        interes, creado = InteresSobreProyecto.objects.update_or_create(
            usuario=usuario,
            proyecto=proyecto,
            defaults={'gustado': gustado}
        )

        emparejado = False
        emparejado_con = None

        # Si el usuario le dio me gusta al proyecto
        if gustado:
            # Obtenemos el asesor o creador a quien se le dará la notificación
            receptor = proyecto.asesor or proyecto.creador

            if receptor and receptor != usuario:
                Notificacion.objects.create(
                    receptor=receptor,
                    mensaje=(
                        f"'{usuario.username}' mostró interés en "
                        f"tu proyecto '{proyecto.nombre}'."
                    ),
                    proyecto_relacionado=proyecto,
                    usuario_relacionado=usuario
                )

            reciproco = InteresSobreUsuario.objects.filter(
                proyecto=proyecto,
                usuario=usuario,
                gustado=True
            ).exists()

            # Si desde el proyecto se le había dado me gusta al usuario
            if reciproco:
                Match.objects.get_or_create(usuario=usuario, proyecto=proyecto)
                emparejado = True

                if receptor:
                    # Se crea la notificación
                    Notificacion.objects.create(
                        receptor=receptor,
                        mensaje=f"¡Hiciste match con '{usuario.username}' en el proyecto '{proyecto.nombre}'!",
                        proyecto_relacionado=proyecto
                    )
                    emparejado_con = receptor.username

                # Se crea la notificación para el usuario
                Notificacion.objects.create(
                    receptor=usuario,
                    mensaje=f"¡Hiciste match con el proyecto '{proyecto.nombre}'!",
                    proyecto_relacionado=proyecto
                )

        return Response({
            **InteresSobreProyectoSerializer(interes).data,
            'emparejado': emparejado,
            'emparejado_con': emparejado_con,
            'proyecto_id': proyecto.id
        }, status=status.HTTP_200_OK)


    @action(detail=False, methods=['post'], url_path='dislike-proyecto')
    def dislike_proyecto(self, request):
        '''
        endpoint específico para indicar que a un usuario le da no me gusta a un proyecto.

        detail=False significa que la url no debe incluir el proyecto especifico
        al cual se le da no me gusta.
        '''

        serializer = InteresSobreProyectoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        proyecto = serializer.validated_data['proyecto']
        gustado = serializer.validated_data['gustado']
        usuario = request.user

        InteresSobreProyecto.objects.update_or_create(
            usuario=usuario,
            proyecto=proyecto,
            defaults={'gustado': gustado}
        )

        return Response({'status': 'Se dió no me gusta al proyecto'})

    @action(detail=False, methods=['post'], url_path='like-usuario')
    def like_usuario(self, request):
        '''
        endpoint específico para indicar que desde un proyecto se le da me gusta a un usuario.

        detail=False significa que la url no debe incluir el usuario especifico
        al cual se le da me gusta.
        '''

        serializer = InteresSobreUsuarioSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        usuario_por_gustar = serializer.validated_data['usuario']
        proyecto = serializer.validated_data['proyecto']
        gustado = serializer.validated_data['gustado']
        usuario_actual = request.user


        if not proyecto:
            return Response({'detail': 'No se encontró el proyecto.'}, status=status.HTTP_404_NOT_FOUND)

        if usuario_actual != proyecto.creador and usuario_actual != proyecto.asesor:
            return Response({'detail': 'No cuentas con permisos para este proyecto.'}, status=status.HTTP_403_FORBIDDEN)

        if usuario_por_gustar == usuario_actual:
            return Response({'detail': 'No puedes dar me gusta a ti mismo.'}, status=status.HTTP_400_BAD_REQUEST)

        if proyecto.estudiantes.filter(id=usuario_por_gustar.id).exists() or proyecto.asesor_id == usuario_por_gustar.id:
            return Response({'detail': 'El usuario ya es parte de este proyecto.'}, status=status.HTTP_400_BAD_REQUEST)

        interes, creado = InteresSobreUsuario.objects.update_or_create(
            proyecto=proyecto,
            usuario=usuario_por_gustar,
            defaults={'gustado': gustado}
        )

        emparejado = False
        emparejado_con = None

        # Si desde el proyecto se le dió me gusta al usuario
        if gustado:
            Notificacion.objects.create(
                receptor=usuario_por_gustar,
                mensaje=(
                    f"¡Al proyecto '{proyecto.nombre}' "
                    f"le interesó tu perfil!"
                ),
                proyecto_relacionado=proyecto
            )

            reciproco = InteresSobreProyecto.objects.filter(
                usuario=usuario_por_gustar,
                proyecto=proyecto,
                gustado=True
            ).exists()

            if reciproco:
                Match.objects.get_or_create(usuario=usuario_por_gustar, proyecto=proyecto)
                emparejado = True
                emparejado_con = usuario_por_gustar.username

                # Se crea la notificación para el usuario
                Notificacion.objects.create(
                    receptor=usuario_por_gustar,
                    mensaje=f"¡Hiciste match con el proyecto '{proyecto.nombre}'!",
                    proyecto_relacionado=proyecto
                )

                # Se crea la notificación para el creador o asesor del proyecto
                Notificacion.objects.create(
                    receptor=usuario_actual,
                    mensaje=f"¡Hiciste match con '{usuario_por_gustar.username}' en el proyecto '{proyecto.nombre}'!",
                    proyecto_relacionado=proyecto
                )

        return Response({
            **InteresSobreUsuarioSerializer(interes).data,
            'emparejado': emparejado,
            'emparejado_con': emparejado_con,
            'proyecto_id': proyecto.id
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='dislike-usuario')
    def dislike_usuario(self, request):
        '''
        endpoint específico para indicar que desde un proyecto se le da no me gusta a un usuario.

        detail=False significa que la url no debe incluir el usuario especifico
        al cual se le da no me gusta.
        '''
        serializer = InteresSobreUsuarioSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        usuario_por_disgustar = serializer.validated_data['usuario']
        proyecto = serializer.validated_data['proyecto']
        gustado = serializer.validated_data['gustado']

        if not proyecto:
            return Response({'detail': 'Proyecto no encontrado.'}, status=404)

        usuario_actual = request.user

        if usuario_actual != proyecto.creador and usuario_actual != proyecto.asesor:
            return Response({'detail': 'No cuentas con permisos para este proyecto.'}, status=403)

        interest, created = InteresSobreUsuario.objects.update_or_create(
            proyecto=proyecto,
            usuario=usuario_por_disgustar,
            defaults={'gustado': gustado}
        )

        return Response({'status': 'Se dió no me gusta al proyecto'})
    
    @action(detail=False, methods=['get'], url_path='ai-usuarios-sugeridos')
    def ai_usuarios_sugeridos(self, request):
        '''
        endpoint específico para obtener sugerencias de usuarios con inteligencia artificial.

        detail=False significa que la url no debe incluir el proyecto especifico
        al cual se le sugieren usuarios.
        '''

        usuario = request.user
        proyecto_id = request.query_params.get('proyecto_id')
        tipo_usuario = request.query_params.get('tipo_usuario', 'estudiante')

        if not proyecto_id:
            return Response({'detail': 'Falta el parámetro proyecto_id.'}, status=status.HTTP_400_BAD_REQUEST)

        proyecto = get_object_or_404(Proyecto, id=proyecto_id)

        if proyecto.creador != usuario and proyecto.asesor != usuario:
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        if tipo_usuario == "asesor" and proyecto.asesor_id:
            return Response([], status=status.HTTP_200_OK)

        if tipo_usuario == "estudiante":
            # Obtenemos estudiantes afines al proyecto
            usuarios = obtener_estudiantes_similares_para_proyecto(proyecto)
        elif tipo_usuario == "asesor":
            # Obtenemos asesores afines al proyecto
            usuarios = obtener_asesores_similares_para_proyecto(proyecto)
        else:
            return Response({'detail': 'tipo_usuario no válido.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(UserSerializer(usuarios, many=True).data)

    @action(detail=False, methods=['get'], url_path='ai-proyectos-sugeridos')
    def ai_proyectos_sugeridos(self, request):
        '''
        endpoint específico para obtener sugerencias de proyectos con inteligencia artificial.

        detail=False significa que la url no debe incluir el usuario especifico
        al cual se le sugieren proyectos.
        '''

        usuario = request.user

        if not (usuario.es_estudiante() or usuario.es_asesor()):
            return Response(
                {'detail': 'Sólo estudiantes y asesores pueden recibir sugerencias.'},
                status=403
            )

        # Obtenemos proyectos afines al usuario
        proyectos = obtener_proyectos_similares_para_usuario(usuario)

        # Si el usuario es asesor, se le muestran proyectos sin asesor
        if usuario.es_asesor():
            proyectos = [p for p in proyectos if p.asesor is None]

        serializer = ProyectoSerializer(
            proyectos,
            many=True,
            context={"request": request}
        )
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='interes-usuario')
    def interes_usuario(self, request):
        usuario_id = request.query_params.get('usuario')
        proyecto_id = request.query_params.get('proyecto')

        existe = InteresSobreUsuario.objects.filter(
            usuario_id=usuario_id,
            proyecto_id=proyecto_id,
            gustado=True
        ).exists()

        return Response({'gustado': existe})

class NotificacionViewSet(viewsets.ModelViewSet):
    '''
    Clase que agrupa la lógica de la API para notificaciones.

    Los verbos Http (GET, POST, PUT, DELETE) están incluidos y son manejados
    por Django REST Framework.
    '''

    serializer_class = NotificacionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notificacion.objects.filter(receptor=self.request.user).order_by('-creado_en')

    @action(detail=True, methods=['post'], url_path='marcar-leido')
    def marcar_leido(self, request, pk=None):
        '''
        endpoint específico para marcar una notificación como leída.

        detail=True significa que la url debe incluir la notificación especifica
        que será marcada como leída.
        '''
        
        try:
            notificacion = self.get_object()
            notificacion.leido = True
            notificacion.save()
            return Response({'status': 'marcada como leída'})
        except:
            return Response({'error': 'Notificación no encontrada'}, status=404)

class PerfilPublicoView(generics.RetrieveAPIView):
    queryset = User.objects.prefetch_related(
        'intereses',
        'habilidades',
        'proyectos_creados',
        'proyectos_asesorados',
        'proyectos_como_estudiante'
    )

    serializer_class = PerfilPublicoSerializer
    permission_classes = [IsAuthenticated]