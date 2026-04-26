from rest_framework import serializers
from .models import Habilidad, Interes, Categoria, Comentario, Proyecto, User, InteresSobreProyecto, InteresSobreUsuario, Match, Notificacion
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
import re

class InteresSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interes
        fields = ['id', 'nombre']

class HabilidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Habilidad
        fields = ['id', 'nombre']

class UserSerializer(serializers.ModelSerializer):
    intereses = serializers.PrimaryKeyRelatedField(many=True, queryset=Interes.objects.all())
    habilidades = serializers.PrimaryKeyRelatedField(many=True, queryset=Habilidad.objects.all())

    class Meta:
        model = User
        fields = '__all__'
        extra_kwargs = {'password': {'write_only': True}} # No queremos regresar la contraseña del usuario
    
    def create(self, validated_data):
        intereses = validated_data.pop('intereses', [])
        habilidades = validated_data.pop('habilidades', [])

        usuario = User.objects.create_user(**validated_data)

        usuario.intereses.set(intereses)
        usuario.habilidades.set(habilidades)
        return usuario

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        # Only validate password on create or when password is provided
        if password:
            temp_user = User(username=username)

            try:
                validate_password(password, user=temp_user)
            except DjangoValidationError as e:
                traducciones = {
                    "This password is too common.": "Esta contraseña es demasiado común.",
                    "This password is too short. It must contain at least 8 characters.": "Esta contraseña es demasiado corta. Debe contener al menos 8 caracteres.",
                    "This password is entirely numeric.": "Esta contraseña no puede contener solo números.",
                    "The password is too similar to the username.": "La contraseña es demasiado similar al nombre de usuario.",
                }

                mensajes = [
                    traducciones.get(msg, msg)
                    for msg in e.messages
                ]

                raise serializers.ValidationError({
                    'password': mensajes
                })

        return attrs
    
    def validate_username(self, value):
        value = value.strip()

        pattern = r'^[a-z]{1,}[a-z0-9]{4,}$'

        if not re.match(pattern, value):
            raise serializers.ValidationError(
                "Usa solo minúsculas y números, comienza con una letra."
            )

        return value

class AutorMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']

class ComentarioSerializer(serializers.ModelSerializer):
    autor = AutorMiniSerializer(read_only=True)

    class Meta:
        model = Comentario
        fields = ['id', 'proyecto', 'autor','contenido', 'creado_en', 'actualizado_en']
        read_only_fields = ['autor', 'creado_en', 'actualizado_en']

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['id', 'nombre']

class ProyectoSerializer(serializers.ModelSerializer):
    categorias = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Categoria.objects.all(),
        write_only=True,
    )
    
    habilidades_requeridas = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Habilidad.objects.all(),
        write_only=True,
    )
    estudiantes = UserSerializer(many=True, read_only=True)
    asesor = UserSerializer(read_only=True)
    creador = UserSerializer(read_only=True)
    detalles_categorias = CategoriaSerializer(many=True, read_only=True, source='categorias')
    detalles_habilidades_requeridas = HabilidadSerializer(many=True, read_only=True, source='habilidades_requeridas')
    tiene_like = serializers.SerializerMethodField()
    estado_normalizado = serializers.SerializerMethodField()
    necesita_estudiantes = serializers.SerializerMethodField()
    necesita_asesor = serializers.SerializerMethodField()

    class Meta:
        model = Proyecto
        fields = [
            'id', 'creado_en', 'nombre', 'descripcion', 'asesor', 'creador', 'estudiantes', 'categorias', 
            'habilidades_requeridas', 'detalles_categorias', 'detalles_habilidades_requeridas', 'estado', 'tiene_like',
            'estado_normalizado', 'necesita_estudiantes', 'necesita_asesor']
        read_only_fields = ['embedding']
    
    def validate_estudiantes(self, usuarios):
        # Los proyectos solo pueden tener hasta 3 estudiantes
        if len(usuarios) > 3:
            raise serializers.ValidationError('Un proyecto no puede tener más de 3 estudiantes.')

        # Revisamos que cada usuario no haya sido asignado a otro proyecto
        for usuario in usuarios:
            if usuario.proyectos.exclude(id=self.instance.id if self.instance else None).exists():
                raise serializers.ValidationError(f'El estudiante {usuario.username} ya está asignado a otro proyecto.')
        return usuarios
    
    def update(self, instance, validated_data):
        categorias = validated_data.pop('categorias', None)
        habilidades = validated_data.pop('habilidades_requeridas', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if categorias is not None:
            instance.categorias.set(categorias)
        if habilidades is not None:
            instance.habilidades_requeridas.set(habilidades)

        return instance

    def get_tiene_like(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        usuario = request.user
        if not usuario or not usuario.is_authenticated:
            return False
        # Regresamos si hubo un like entre usuario y proyecto
        return InteresSobreProyecto.objects.filter(
            usuario=usuario,
            proyecto=obj,
            gustado=True
        ).exists()

    def validate_descripcion(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                "La descripción no puede estar vacía."
            )
        return value
    
    def validate_nombre(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                "El nombre no puede estar vacío."
            )
        return value

    def validate_categorias(self, value):
        if value is not None and len(value) == 0:
            raise serializers.ValidationError({
                'Selecciona al menos una categoría.'
            })
        return value

    def validate_habilidades_requeridas(self, value):
        if value is not None and len(value) == 0:
            raise serializers.ValidationError({
                'Selecciona al menos una habilidade requerida.'
            })
        return value

    def get_estado_normalizado(self, obj):
        return obj.estado_normalizado

    def get_necesita_estudiantes(self, obj):
        return obj.necesita_estudiantes

    def get_necesita_asesor(self, obj):
        return obj.necesita_asesor

class PerfilUsuarioSerializer(serializers.ModelSerializer):
    intereses = serializers.PrimaryKeyRelatedField(many=True, queryset=Interes.objects.all())
    habilidades = serializers.PrimaryKeyRelatedField(many=True, queryset=Habilidad.objects.all())
    proyectos = serializers.PrimaryKeyRelatedField(
        many=True,
        read_only=True,
        source='proyectos_como_estudiante'
    )

    class Meta:
        model = User
        fields = ['id', 'intereses', 'habilidades', 'estado', 'tipo_usuario', 'proyectos', 'bio']
    
    def update(self, instance, validated_data):
        intereses = validated_data.pop('intereses', None)
        habilidades = validated_data.pop('habilidades', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if intereses is not None:
            instance.intereses.set(intereses)
        if habilidades is not None:
            instance.habilidades.set(habilidades)

        instance.save()
        return instance

class InteresSobreProyectoSerializer(serializers.ModelSerializer):
    usuario = serializers.PrimaryKeyRelatedField(read_only=True)
    proyecto = serializers.PrimaryKeyRelatedField(queryset=Proyecto.objects.all())
    gustado = serializers.BooleanField()

    class Meta:
        model = InteresSobreProyecto
        fields = ['id', 'usuario', 'proyecto', 'gustado', 'creado_en']
        read_only_fields = ['id', 'usuario', 'creado_en']

class InteresSobreUsuarioSerializer(serializers.ModelSerializer):
    usuario = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    proyecto = serializers.PrimaryKeyRelatedField(queryset=Proyecto.objects.all())
    gustado = serializers.BooleanField()

    class Meta:
        model = InteresSobreUsuario
        fields = ['id', 'usuario', 'proyecto', 'gustado', 'creado_en']
        read_only_fields = ['id', 'creado_en']

class MatchSerializer(serializers.ModelSerializer):
    usuario = serializers.PrimaryKeyRelatedField(read_only=True)
    proyecto = serializers.PrimaryKeyRelatedField(read_only=True)
    emparejado_en = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Match
        fields = ['id', 'usuario', 'proyecto', 'emparejado_en']

class NotificacionSerializer(serializers.ModelSerializer):
    nombre_proyecto_relacionado = serializers.CharField(source='proyecto_relacionado.nombre', read_only=True)
    username_usuario_relacionado = serializers.CharField(source='usuario_relacionado.username', read_only=True)

    class Meta:
        model = Notificacion
        fields = [
            'id', 'mensaje', 'leido', 'creado_en', 'proyecto_relacionado', 'nombre_proyecto_relacionado',
            'usuario_relacionado', 'username_usuario_relacionado']
        read_only_fields = ['id', 'creado_en', 'nombre_proyecto_relacionado', 'username_usuario_relacionado']

class DetalleUsuarioSerializer(serializers.ModelSerializer):
    habilidades = HabilidadSerializer(many=True)
    intereses = InteresSerializer(many=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'bio', 'habilidades', 'intereses']

class ProyectoMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proyecto
        fields = ['id', 'nombre']

class PerfilPublicoSerializer(serializers.ModelSerializer):
    intereses = InteresSerializer(many=True, read_only=True)
    habilidades = HabilidadSerializer(many=True, read_only=True)
    proyectos = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'tipo_usuario',
            'estado',
            'bio',
            'intereses',
            'habilidades',
            'proyectos'
        ]

    def get_proyectos(self, obj):
        proyectos = (
            list(obj.proyectos_creados.all()) +
            list(obj.proyectos_asesorados.all()) +
            list(obj.proyectos_como_estudiante.all())
        )

        # eliminar duplicados por id
        proyectos_unicos = {p.id: p for p in proyectos}.values()

        return ProyectoMiniSerializer(
            proyectos_unicos,
            many=True
        ).data
