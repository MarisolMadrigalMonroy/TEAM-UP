# api/signals.py

from django.db.models.signals import pre_save, m2m_changed, post_save
from django.dispatch import receiver
from .models import User, Project
from .utils.embedding import get_embedding, build_user_embedding_text, build_project_embedding_text
import numpy as np

@receiver(post_save, sender=User)
def update_user_embedding(sender, instance, created, **kwargs):
    embedding_input = build_user_embedding_text(instance)
    if not embedding_input:
        return

    new_embedding = get_embedding(embedding_input)

    if instance.embedding is None or not np.allclose(
        np.array(instance.embedding),
        np.array(new_embedding),
        atol=1e-6
    ):
        User.objects.filter(pk=instance.pk).update(embedding=new_embedding)

@receiver(m2m_changed, sender=User.interests.through)
def update_user_embedding_on_interests(sender, instance, action, **kwargs):
    if action in ["post_add", "post_remove", "post_clear"]:
        embedding_input = build_user_embedding_text(instance)
        if embedding_input:
            new_embedding = get_embedding(embedding_input)
            if instance.embedding is None or not np.allclose(
                np.array(instance.embedding),
                np.array(new_embedding),
                atol=1e-6
            ):
                instance.embedding = new_embedding
                instance.save(update_fields=["embedding"])


@receiver(m2m_changed, sender=User.abilities.through)
def update_user_embedding_on_abilities(sender, instance, action, **kwargs):
    if action in ["post_add", "post_remove", "post_clear"]:
        embedding_input = build_user_embedding_text(instance)
        if embedding_input:
            new_embedding = get_embedding(embedding_input)
            if instance.embedding is None or not np.allclose(
                np.array(instance.embedding),
                np.array(new_embedding),
                atol=1e-6
            ):
                instance.embedding = new_embedding
                instance.save(update_fields=["embedding"])

@receiver(pre_save, sender=Project)
def update_project_embedding(sender, instance, **kwargs):
    if not instance.pk:
        return

    try:
        old_instance = Project.objects.get(pk=instance.pk)
    except Project.DoesNotExist:
        return

    name_changed = old_instance.name != instance.name
    description_changed = old_instance.description != instance.description

    if name_changed or description_changed:
        embedding_input = build_project_embedding_text(instance)
        if embedding_input:
            new_embedding = get_embedding(embedding_input)
            if instance.embedding is None or not np.allclose(
                np.array(instance.embedding),
                np.array(new_embedding),
                atol=1e-6
            ):
                instance.embedding = new_embedding

@receiver(m2m_changed, sender=Project.required_abilities.through)
def update_project_embedding_on_abilities(sender, instance, action, **kwargs):
    if action in ["post_add", "post_remove", "post_clear"]:
        embedding_input = build_project_embedding_text(instance)
        if embedding_input:
            new_embedding = get_embedding(embedding_input)

            if instance.embedding is None or not np.allclose(
                np.array(instance.embedding),
                np.array(new_embedding),
                atol=1e-6
            ):
                instance.embedding = new_embedding
                instance.save(update_fields=["embedding"])