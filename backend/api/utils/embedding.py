# utils/embedding.py

from django.db.models import F, Q
from pgvector.django import L2Distance
from api.models import User, Project, UserMatchInterest, ProjectMatch, ProjectMatchInterest
from openai import OpenAI
from django.conf import settings


client = OpenAI(api_key=settings.OPENAI_API_KEY)

def get_embedding(text):
    if not text:
        return None
    response = client.embeddings.create(
        input=[text],
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

def build_user_embedding_text(user):
    interest_names = ""
    ability_names = ""

    if user.pk:
        interest_names = ", ".join([i.name for i in user.interests.all()])
        ability_names = ", ".join([a.name for a in user.abilities.all()])

    return f"{user.bio or ''}\nInterests: {interest_names}\nAbilities: {ability_names}"

def build_project_embedding_text(project):
    ability_names = ', '.join([a.name for a in project.required_abilities.all()])
    return f"Project Name: {project.name or ''}\nDescription: {project.description or ''}\nRequired Abilities: {ability_names}"


def get_similar_students_for_project(project, top_k=10):
    if project.embedding is None:
        return User.objects.none()

    excluded_user_ids = set(
        UserMatchInterest.objects.filter(project=project).values_list('user_id', flat=True)
    ).union(
        ProjectMatch.objects.filter(project=project).values_list('user_id', flat=True)
    )

    # Exclude all creators and mentors (students can’t be them)
    project_creators = Project.objects.values_list('creator_id', flat=True)
    project_mentors = Project.objects.values_list('mentor_id', flat=True)
    excluded_user_ids.update(project_creators)
    excluded_user_ids.update(project_mentors)

    # Exclude students already enrolled in another project
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
    if project.embedding is None:
        return User.objects.none()

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
    if user.embedding is None:
        return Project.objects.none()

    excluded_project_ids = set(
        ProjectMatchInterest.objects.filter(user=user).values_list('project_id', flat=True)
    )

    excluded_project_ids.update(
        ProjectMatch.objects.filter(user=user).values_list('project_id', flat=True)
    )

    excluded_project_ids.update(
        Project.objects.filter(Q(creator=user) | Q(mentor=user)).values_list('id', flat=True)
    )

    print("EXCLUDED PROJECT IDS:", excluded_project_ids, "FOR USER:", user)

    candidates = Project.objects.filter(
        embedding__isnull=False
    ).exclude(id__in=excluded_project_ids)

    print("CANDIDATE IDS:", list(candidates.values_list('id', flat=True)))

    return candidates.annotate(
        distance=L2Distance(F('embedding'), user.embedding)
    ).order_by('distance')[:top_k]


