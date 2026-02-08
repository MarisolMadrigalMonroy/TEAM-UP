from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.utils import timezone
from pgvector.django import VectorField

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Interest(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name
    
class Ability(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name
    
class User(AbstractUser):
    STUDENT = 'student'
    MENTOR = 'mentor'
    USER_TYPE_CHOICES = [
        (STUDENT, 'Student'),
        (MENTOR, 'Mentor'),
    ]
    USER_STATUS_CHOICES = [
    ('available', 'Looking for a Project'),
    ('enrolled', 'Enrolled in a Project'),
    ('inactive', 'Not Currently Looking'),
    ]
    user_type = models.CharField(max_length=10, blank=True, choices=USER_TYPE_CHOICES)
    interests = models.ManyToManyField(Interest, blank=True, related_name='interested_users')
    abilities = models.ManyToManyField(Ability, blank=True, related_name='skilled_users')
    status = models.CharField(
        max_length=20,
        choices=USER_STATUS_CHOICES,
        default='available'
    )
    bio = models.TextField(blank=True)  # AI embeddings
    embedding = VectorField(dimensions=1536, blank=True, null=True)  # OpenAI embeddings

    def is_student(self):
        return self.user_type == self.STUDENT
    
    def is_mentor(self):
        return self.user_type == self.MENTOR
    
class Project(models.Model):
    created_at = models.DateTimeField(default=timezone.now)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    mentor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'user_type': User.MENTOR},
        related_name='mentored_projects'
    )
    students = models.ManyToManyField(
        User,
        related_name='projects_as_student',
        blank=True,
        limit_choices_to={'user_type': User.STUDENT},
    )
    creator = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_projects'
    )
    categories = models.ManyToManyField(Category, related_name='projects', blank=True)
    required_abilities = models.ManyToManyField(Ability, blank=True, related_name='projects')
    STATUS_CHOICES = [
        ('looking_students', 'Looking for Students'),
        ('team_complete', 'Team Complete'),
        ('looking_mentor', 'Looking for Mentor'),
        ('in_progress', 'Under Development'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='looking_students'
    )
    embedding = VectorField(dimensions=1536, blank=True, null=True)  # matching

class Comment(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    
    def __str__(self):
        return f'{self.author.username} - {self.project.name}'

class ProjectMatchInterest(models.Model):
    '''
    Tracks whether a user liked/disliked a project.
    Ensures each user can vote once per project (unique_together).
    '''
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='project_likes')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='liked_by_users')
    liked = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'project')

    def __str__(self):
        return f"{self.user.username} {'liked' if self.liked else 'disliked'} {self.project.name}"


class UserMatchInterest(models.Model):
    '''
    Tracks whether a project (via its admin/mentor) liked/disliked a user.
    Same uniqueness constraint per user-project pair.
    '''
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='user_likes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='liked_by_projects')
    liked = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('project', 'user')

    def __str__(self):
        return f"{self.project.name} {'liked' if self.liked else 'disliked'} {self.user.username}"


class ProjectMatch(models.Model):
    '''
    Created only when both sides like each other.
    Indicates a confirmed match.
    '''
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    matched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'project')

    def __str__(self):
        return f"{self.user.username} matched with {self.project.name}"

class Notification(models.Model):
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    related_project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Notification for {self.recipient.username}: {self.message[:50]}'
