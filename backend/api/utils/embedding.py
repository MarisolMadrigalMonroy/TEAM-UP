# utils/embedding.py

from django.db.models import F, Q
from pgvector.django import L2Distance
from api.models import User, Proyecto, InteresSobreUsuario, Match, InteresSobreProyecto
from openai import OpenAI
from django.conf import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def obtener_embedding(texto):
    '''
    Genera la representación vectorial a partir de un texto.

    Argumentos:
        texto: Texto a convertir en representación vectorial.
    '''
    if not texto:
        return None
    response = client.embeddings.create(
        input=[texto],
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

def construir_texto_embedding_usuario(usuario):
    '''
    Genera el texto base para la creación de la representación vectorial de un usuario.

    La representación vectorial toma en cuenta la biografía del usuario, intereses y habilidades.

    Argumentos:
        usuario: El usuario
    '''
    nombres_intereses = ""
    nombres_habilidades = ""

    if usuario.pk:
        nombres_intereses = ", ".join([i.nombre for i in usuario.intereses.all()])
        nombres_habilidades = ", ".join([a.nombre for a in usuario.habilidades.all()])

    return f"{usuario.bio or ''}\nIntereses: {nombres_intereses}\nHabilidades: {nombres_habilidades}"

def construir_texto_embedding_proyecto(proyecto):
    '''
    Genera el texto base para la creación de la representación vectorial de un proyecto.

    La representación vectorial toma en cuenta el nombre del proyecto, descripción y habilidades requeridas.

    Argumentos:
        proyecto: El proyecto
    '''
    nombres_habilidades = ', '.join([a.nombre for a in proyecto.habilidades_requeridas.all()])
    return f"Proyecto: {proyecto.nombre or ''}\nDescripcion: {proyecto.descripcion or ''}\nHabilidades Requeridas: {nombres_habilidades}"


def obtener_estudiantes_similares_para_proyecto(proyecto, top_k=10):
    '''
    Obtiene estudiantes afines a un proyecto.

    Argumentos:
        proyecto: El proyecto
        top_k: Cantidad de estudiantes a obtener
    '''
    if proyecto.embedding is None:
        return User.objects.none()

    usuarios_excluidos_ids = set(
        InteresSobreUsuario.objects.filter(proyecto=proyecto).values_list('usuario_id', flat=True)
    ).union(
        Match.objects.filter(proyecto=proyecto).values_list('usuario_id', flat=True)
    )

    # Excluir asesores y creadores de proyectos
    creadores_de_proyecto = Proyecto.objects.values_list('creador_id', flat=True)
    asesores_de_proyecto = Proyecto.objects.values_list('asesor_id', flat=True)
    usuarios_excluidos_ids.update(creadores_de_proyecto)
    usuarios_excluidos_ids.update(asesores_de_proyecto)

    # Excluir estudiantes registrados en otros proyectos
    estudiantes_en_proyectos = User.objects.filter(
        tipo_usuario='estudiante',
        proyectos_como_estudiante__isnull=False
    ).values_list('id', flat=True)
    usuarios_excluidos_ids.update(estudiantes_en_proyectos)

    candidatos = User.objects.filter(
        tipo_usuario='estudiante',
        estado='disponible',
        embedding__isnull=False
    ).exclude(id__in=usuarios_excluidos_ids)

    return candidatos.annotate(
        distance=L2Distance(F('embedding'), proyecto.embedding)
    ).order_by('distance')[:top_k]


def obtener_asesores_similares_para_proyecto(proyecto, top_k=10):
    '''
    Obtiene asesores afines a un proyecto.

    Argumentos:
        proyecto: El proyecto
        top_k: Cantidad de asesores a obtener
    '''
    if proyecto.embedding is None:
        return User.objects.none()

    # Excluir a los asesores que ya se les dió me gusta y con los que ya se hizo match
    usuarios_excluidos_ids = set(
        InteresSobreUsuario.objects.filter(proyecto=proyecto).values_list('usuario_id', flat=True)
    ).union(
        Match.objects.filter(proyecto=proyecto).values_list('usuario_id', flat=True)
    )

    usuarios_excluidos_ids.add(proyecto.creador_id)

    candidatos = User.objects.filter(
        tipo_usuario='asesor',
        estado='disponible',
        embedding__isnull=False
    ).exclude(id__in=usuarios_excluidos_ids)

    return candidatos.annotate(
        distance=L2Distance(F('embedding'), proyecto.embedding)
    ).order_by('distance')[:top_k]


def obtener_proyectos_similares_para_usuario(usuario, top_k=10):
    '''
    Obtiene proyectos afines a un usuario.

    Argumentos:
        usuario: El usuario
        top_k: Cantidad de proyectos a obtener
    '''
    if usuario.embedding is None:
        return Proyecto.objects.none()

    # Excluir proyectos a los que ya se les dió me gusta
    proyectos_excluidos_ids = set(
        InteresSobreProyecto.objects.filter(usuario=usuario).values_list('proyecto_id', flat=True)
    )

    # Excluir proyectos con los que ya se hizo match
    proyectos_excluidos_ids.update(
        Match.objects.filter(usuario=usuario).values_list('proyecto_id', flat=True)
    )

    # Excluir proyectos de los cuales se es creador o mentor
    proyectos_excluidos_ids.update(
        Proyecto.objects.filter(Q(creador=usuario) | Q(asesor=usuario)).values_list('id', flat=True)
    )

    candidatos = Proyecto.objects.filter(
        embedding__isnull=False
    ).exclude(id__in=proyectos_excluidos_ids)

    return candidatos.annotate(
        distance=L2Distance(F('embedding'), usuario.embedding)
    ).order_by('distance')[:top_k]
