from rest_framework import serializers
from .models import Habilidad, Interes, Categoria, Comentario, Proyecto, User, InteresSobreProyecto, InteresSobreUsuario, Match, Notificacion

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


class ComentarioSerializer(serializers.ModelSerializer):
    autor_username = serializers.ReadOnlyField(source='autor.username')

    class Meta:
        model = Comentario
        fields = ['id', 'proyecto', 'autor', 'autor_username', 'contenido', 'creado_en', 'actualizado_en']
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
    detalles_categorias = CategoriaSerializer(many=True, read_only=True, source='categorias')
    detalles_habilidades_requeridas = HabilidadSerializer(many=True, read_only=True, source='habilidades_requeridas')
    tiene_like = serializers.SerializerMethodField()

    class Meta:
        model = Proyecto
        fields = [
            'id', 'creado_en', 'nombre', 'descripcion', 'asesor', 'creador', 'estudiantes', 'categorias', 
            'habilidades_requeridas', 'detalles_categorias', 'detalles_habilidades_requeridas', 'estado', 'tiene_like']
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

    class Meta:
        model = Notificacion
        fields = ['id', 'mensaje', 'leido', 'creado_en', 'proyecto_relacionado', 'nombre_proyecto_relacionado']
        read_only_fields = ['id', 'creado_en', 'nombre_proyecto_relacionado']

class DetalleUsuarioSerializer(serializers.ModelSerializer):
    habilidades = HabilidadSerializer(many=True)
    intereses = InteresSerializer(many=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'bio', 'habilidades', 'intereses']

