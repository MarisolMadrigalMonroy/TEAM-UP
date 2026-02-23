# utils/embedding.py

from django.db.models import F, Q
from pgvector.django import L2Distance
from api.models import User, Project, UserMatchInterest, ProjectMatch, ProjectMatchInterest
from openai import OpenAI
from django.conf import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def get_embedding(text):
    '''
    Genera la representación vectorial a partir de un texto.

    Argumentos:
        text: Texto a convertir en representación vectorial.
    '''
    if not text:
        return None
    response = client.embeddings.create(
        input=[text],
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

def build_user_embedding_text(user):
    '''
    Genera el texto base para la creación de la representación vectorial de un usuario.

    La representación vectorial toma en cuenta la biografía del usuario, intereses y habilidades.

    Argumentos:
        user: El usuario
    '''
    interest_names = ""
    ability_names = ""

    if user.pk:
        interest_names = ", ".join([i.name for i in user.interests.all()])
        ability_names = ", ".join([a.name for a in user.abilities.all()])

    return f"{user.bio or ''}\nInterests: {interest_names}\nAbilities: {ability_names}"

def build_project_embedding_text(project):
    '''
    Genera el texto base para la creación de la representación vectorial de un proyecto.

    La representación vectorial toma en cuenta el nombre del proyecto, descripción y habilidades requeridas.

    Argumentos:
        project: El proyecto
    '''
    ability_names = ', '.join([a.name for a in project.required_abilities.all()])
    return f"Project Name: {project.name or ''}\nDescription: {project.description or ''}\nRequired Abilities: {ability_names}"


def get_similar_students_for_project(project, top_k=10):
    '''
    Obtiene estudiantes afines a un proyecto.

    Argumentos:
        project: El proyecto
        top_k: Cantidad de estudiantes a obtener
    '''
    if project.embedding is None:
        return User.objects.none()

    excluded_user_ids = set(
        UserMatchInterest.objects.filter(project=project).values_list('user_id', flat=True)
    ).union(
        ProjectMatch.objects.filter(project=project).values_list('user_id', flat=True)
    )

    # Excluir asesores y creadores de proyectos
    project_creators = Project.objects.values_list('creator_id', flat=True)
    project_mentors = Project.objects.values_list('mentor_id', flat=True)
    excluded_user_ids.update(project_creators)
    excluded_user_ids.update(project_mentors)

    # Excluir estudiantes registrados en otros proyectos
    students_in_projects = User.objects.filter(
        user_type='student',
        projects_as_student__isnull=False
    ).values_list('id', flat=True)
    excluded_user_ids.update(students_in_projects)

    candidates = User.objects.filter(
        user_type='student',
        embedding__isnull=False
    ).exclude(id__in=excluded_user_ids)

    return candidates.annotate(
        distance=L2Distance(F('embedding'), project.embedding)
    ).order_by('distance')[:top_k]


def get_similar_mentors_for_project(project, top_k=10):
    '''
    Obtiene asesores afines a un proyecto.

    Argumentos:
        project: El proyecto
        top_k: Cantidad de asesores a obtener
    '''
    if project.embedding is None:
        return User.objects.none()

    # Excluir a los asesores que ya se les dió me gusta y con los que ya se hizo match
    excluded_user_ids = set(
        UserMatchInterest.objects.filter(project=project).values_list('user_id', flat=True)
    ).union(
        ProjectMatch.objects.filter(project=project).values_list('user_id', flat=True)
    )

    excluded_user_ids.add(project.creator_id)

    candidates = User.objects.filter(
        user_type='mentor',
        embedding__isnull=False
    ).exclude(id__in=excluded_user_ids)

    return candidates.annotate(
        distance=L2Distance(F('embedding'), project.embedding)
    ).order_by('distance')[:top_k]


def get_similar_projects_for_user(user, top_k=10):
    '''
    Obtiene proyectos afines a un usuario.

    Argumentos:
        user: El usuario
        top_k: Cantidad de proyectos a obtener
    '''
    if user.embedding is None:
        return Project.objects.none()

    # Excluir proyectos a los que ya se les dió me gusta
    excluded_project_ids = set(
        ProjectMatchInterest.objects.filter(user=user).values_list('project_id', flat=True)
    )

    # Excluir proyectos con los que ya se hizo match
    excluded_project_ids.update(
        ProjectMatch.objects.filter(user=user).values_list('project_id', flat=True)
    )

    # Excluir proyectos de los cuales se es creador o mentor
    excluded_project_ids.update(
        Project.objects.filter(Q(creator=user) | Q(mentor=user)).values_list('id', flat=True)
    )

    candidates = Project.objects.filter(
        embedding__isnull=False
    ).exclude(id__in=excluded_project_ids)

    return candidates.annotate(
        distance=L2Distance(F('embedding'), user.embedding)
    ).order_by('distance')[:top_k]
