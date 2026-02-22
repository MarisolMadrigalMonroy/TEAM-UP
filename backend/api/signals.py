# api/signals.py

from django.db.models.signals import pre_save, m2m_changed, post_save
from django.dispatch import receiver
from .models import User, Project
from .utils.embedding import get_embedding, build_user_embedding_text, build_project_embedding_text
import numpy as np

@receiver(post_save, sender=User)
def update_user_embedding(sender, instance, created, **kwargs):
    """
    Recalcula y actualiza la representación vectorial (embedding) para una instancia
    de usuario después de guardarse.

    La señal es activada para cada evento 'post_save' de un usuario. Construye una
    representación textual del perfil del usuario, genera una nueva representación
    vectorial y actualiza el vector si ha cambiado significativamente.

    La representación vectorial se actualiza usando 'QuerySet.update()' en lugar de
    'instance.save()' para evitar activar la misma señal una y otra vez.

    La comparación usa 'numpy.allclose' con una tolerancia pequeña para evitar
    escrituras innecesarias a la base de datos causadas por pequeñas diferencias
    en valores de punto flotante.

    Argumentos:
        sender (Model): La clase del modelo (User).
        instance (User): La instancia guardada del usuario.
        created (bool): Si la instancia fue creada o no.
        **kwargs: Argumentos adicionales pasados por la señal.
    """
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
    """
    Actualiza la representación vectorial (embedding) para una instancia
    de usuario si la tabla intermedia de intereses del usuario cambia.

    La señal es activada cuando los intereses del usuario cambian a través
    de 'm2m_changed' (la relación muchos a muchos)

    Argumentos:
        sender (Model): La relación muchos a muchos entre usuarios e intereses.
        instance (User): La instancia guardada del usuario.
        action: La acción que activó la señal.
        **kwargs: Argumentos adicionales pasados por la señal.
    """
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
    """
    Actualiza la representación vectorial (embedding) para una instancia
    de usuario si la tabla intermedia de habilidades del usuario cambia.

    La señal es activada cuando las habilidades del usuario cambian a través
    de 'm2m_changed' (la relación muchos a muchos)

    Argumentos:
        sender (Model): La relación muchos a muchos entre usuarios y habilidades.
        instance (User): La instancia guardada del usuario.
        action: La acción que activó la señal.
        **kwargs: Argumentos adicionales pasados por la señal.
    """
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
    """
    Recalcula y actualiza la representación vectorial (embedding) para una instancia
    de proyecto.

    La representación vectorial se actualiza si hubo cambios significativos en
    el nombre o la descripción del proyecto.

    La comparación usa 'numpy.allclose' con una tolerancia pequeña para evitar
    escrituras innecesarias a la base de datos causadas por pequeñas diferencias
    en valores de punto flotante.

    Argumentos:
        sender (Model): La clase del modelo (Project).
        instance (Project): La instancia guardada del usuario.
        **kwargs: Argumentos adicionales pasados por la señal.
    """
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
    """
    Actualiza la representación vectorial (embedding) para una instancia
    de proyecto si la tabla intermedia de habilidades requeridas del proyecto cambia.

    La señal es activada cuando las habilidades para el proyecto cambian a través
    de 'm2m_changed' (la relación muchos a muchos)

    Argumentos:
        sender (Model): La relación muchos a muchos entre proyecto y habilidades requeridas.
        instance (Project): La instancia guardada del proyecto.
        action: La acción que activó la señal.
        **kwargs: Argumentos adicionales pasados por la señal.
    """
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