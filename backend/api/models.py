from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.utils import timezone
from pgvector.django import VectorField

class Categoria(models.Model):
    '''
    Modelo que representa categorías para proyectos
    '''

    nombre = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nombre

class Interes(models.Model):
    '''
    Modelo que representa intereses de usuarios
    '''

    nombre = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nombre

class Habilidad(models.Model):
    '''
    Modelo que representa habilidades de usuarios
    '''

    nombre = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nombre

class User(AbstractUser):
    '''
    Modelo que representa usuarios
    '''

    ESTUDIANTE = 'estudiante'
    ASESOR = 'asesor'
    TIPO_USUARIO = [
        (ESTUDIANTE, 'Estudiante'),
        (ASESOR, 'Asesor'),
    ]
    ESTADO_USUARIO = [
    ('disponible', 'Buscando Proyecto'),
    ('registrado', 'En un Proyecto'),
    ('inactivo', 'No Estoy Buscando Proyecto'),
    ]
    tipo_usuario = models.CharField(max_length=10, blank=True, choices=TIPO_USUARIO)
    intereses = models.ManyToManyField(Interes, blank=True, related_name='intereses_usuarios')
    habilidades = models.ManyToManyField(Habilidad, blank=True, related_name='habilidades_usuarios')
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_USUARIO,
        default='disponible'
    )
    bio = models.TextField(blank=True)  # Usado para embeddings de IA
    embedding = VectorField(dimensions=1536, blank=True, null=True)  # embeddings con OpenAI

    def es_estudiante(self):
        return self.tipo_usuario == self.ESTUDIANTE
    
    def es_asesor(self):
        return self.tipo_usuario == self.ASESOR
    
class Proyecto(models.Model):
    '''
    Modelo que representa proyectos
    '''

    creado_en = models.DateTimeField(default=timezone.now)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    # Los proyectos tienen un asesor
    asesor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'tipo_usuario': User.ASESOR},
        related_name='proyectos_asesorados'
    )
    # Los proyectos tienen estudiantes
    estudiantes = models.ManyToManyField(
        User,
        related_name='proyectos_como_estudiante',
        blank=True,
        limit_choices_to={'tipo_usuario': User.ESTUDIANTE},
    )
    # Los proyectos tienen un creador
    creador = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='proyectos_creados'
    )
    categorias = models.ManyToManyField(Categoria, related_name='proyectos', blank=True)
    habilidades_requeridas = models.ManyToManyField(Habilidad, blank=True, related_name='proyectos')
    ESTADOS = [
        ('buscando_estudiantes', 'Buscando Estudiantes'),
        ('equipo_completo', 'Equipo Completo'),
        ('buscando_asesor', 'Buscando Asesor'),
        ('en_progreso', 'En Progreso'),
        ('terminado', 'Terminado'),
        ('cancelado', 'Cancelado'),
    ]
    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default='buscando_estudiantes'
    )
    embedding = VectorField(dimensions=1536, blank=True, null=True)  # matching

class Comentario(models.Model):
    '''
    Modelo que representa comentarios
    '''

    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE, related_name='comentarios')
    autor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comentarios')
    contenido = models.TextField()
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['creado_en']

    
    def __str__(self):
        return f'{self.autor.username} - {self.proyecto.nombre}'

class InteresSobreProyecto(models.Model):
    '''
    Registra si un usuario dio me gusta/no me gusta a un proyecto.
    Asegura que cada usuario puede votar una vez por proyecto (unique_together).
    '''

    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='likes_a_proyecto')
    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE, related_name='gustado_por_usuarios')
    gustado = models.BooleanField()
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('usuario', 'proyecto')

    def __str__(self):
        return f"{self.usuario.username} {'dio me gusta a' if self.gustado else 'dio no me gusta a'} {self.proyecto.nombre}"


class InteresSobreUsuario(models.Model):
    '''
    Registra si un proyecto (a través de su asesor/creador) dio me gusta/no me gusta a un usuario.
    Misma restricción de valores únicos por par usuario-proyecto.
    '''

    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE, related_name='likes_a_usuario')
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gustado_por_proyectos')
    gustado = models.BooleanField()
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('proyecto', 'usuario')

    def __str__(self):
        return f"{self.proyecto.nombre} {'dio me gusta a' if self.gustado else 'dio no me gusta a'} {self.usuario.username}"


class Match(models.Model):
    '''
    Se crea sólo cuando ambos (usuario-proyecto) se dieron me gusta.
    Indica un match confirmado.
    '''
    
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    proyecto = models.ForeignKey(Proyecto, on_delete=models.CASCADE)
    emparejado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('usuario', 'proyecto')

    def __str__(self):
        return f"{self.usuario.username} hizo match con {self.proyecto.nombre}"

class Notificacion(models.Model):
    '''
    Representa una notificación para los usuarios.
    Las notificaciones se crean cuando existe un match.
    '''

    receptor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notificaciones'
    )
    mensaje = models.TextField()
    leido = models.BooleanField(default=False)
    creado_en = models.DateTimeField(auto_now_add=True)
    proyecto_relacionado = models.ForeignKey(
        Proyecto,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notificaciones'
    )
    usuario_relacionado = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notificaciones_generadas'
    )

    class Meta:
        ordering = ['-creado_en']

    def __str__(self):
        return f'Notificación para {self.receptor.username}: {self.mensaje[:50]}'
