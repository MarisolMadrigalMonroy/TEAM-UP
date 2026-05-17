# api/signals.py

from django.db.models.signals import pre_save, m2m_changed, post_save
from django.dispatch import receiver
from .models import User, Proyecto
from .utils.embedding import obtener_embedding, construir_texto_embedding_usuario, construir_texto_embedding_proyecto
import numpy as np

@receiver(post_save, sender=User)
def actualizar_embedding_de_usuario(sender, instance, created, **kwargs):
    """
    Recalcula y actualiza la representación vectorial (embedding) para una instancia
    de usuario después de guardarse.

    La señal es activada para cada evento 'post_save' de un usuario. Construye una
    representación textual del perfil del usuario, genera una nueva representación
    vectorial y actualiza el vector si ha cambiado significativamente.

    La representación vectorial se actualiza usando 'QuerySet.update()' en lugar de
    'instancia.save()' para evitar activar la misma señal una y otra vez.

    La comparación usa 'numpy.allclose' con una tolerancia pequeña para evitar
    escrituras innecesarias a la base de datos causadas por pequeñas diferencias
    en valores de punto flotante.

    Argumentos:
        sender (Model): La clase del modelo (User).
        instance (User): La instancia guardada del usuario.
        created (bool): Si la instancia fue creada o no.
        **kwargs: Argumentos adicionales pasados por la señal.
    """
    entrada = construir_texto_embedding_usuario(instance)
    if not entrada:
        return

    nuevo_embedding = obtener_embedding(entrada)

    if instance.embedding is None or not np.allclose(
        np.array(instance.embedding),
        np.array(nuevo_embedding),
        atol=1e-6
    ):
        User.objects.filter(pk=instance.pk).update(embedding=nuevo_embedding)

@receiver(m2m_changed, sender=User.intereses.through)
def actualizar_embedding_de_usuario_sobre_intereses(sender, instance, action, **kwargs):
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
        entrada = construir_texto_embedding_usuario(instance)
        if entrada:
            nuevo_embedding = obtener_embedding(entrada)
            if instance.embedding is None or not np.allclose(
                np.array(instance.embedding),
                np.array(nuevo_embedding),
                atol=1e-6
            ):
                instance.embedding = nuevo_embedding
                instance.save(update_fields=["embedding"])


@receiver(m2m_changed, sender=User.habilidades.through)
def actualizar_embedding_de_usuario_sobre_habilidades(sender, instance, action, **kwargs):
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
        entrada = construir_texto_embedding_usuario(instance)
        if entrada:
            nuevo_embedding = obtener_embedding(entrada)
            if instance.embedding is None or not np.allclose(
                np.array(instance.embedding),
                np.array(nuevo_embedding),
                atol=1e-6
            ):
                instance.embedding = nuevo_embedding
                instance.save(update_fields=["embedding"])

@receiver(pre_save, sender=Proyecto)
def actualizar_embedding_de_proyecto(sender, instance, **kwargs):
    """
    Recalcula y actualiza la representación vectorial (embedding) para una instancia
    de proyecto.

    La representación vectorial se actualiza si hubo cambios significativos en
    el nombre o la descripción del proyecto.

    La comparación usa 'numpy.allclose' con una tolerancia pequeña para evitar
    escrituras innecesarias a la base de datos causadas por pequeñas diferencias
    en valores de punto flotante.

    Argumentos:
        sender (Model): La clase del modelo (Proyecto).
        instance (Proyecto): La instancia guardada del usuario.
        **kwargs: Argumentos adicionales pasados por la señal.
    """
    if not instance.pk:
        return

    try:
        instancia_anterior = Proyecto.objects.get(pk=instance.pk)
    except Proyecto.DoesNotExist:
        return

    cambio_en_nombre = instancia_anterior.nombre != instance.nombre
    cambio_en_descripcion = instancia_anterior.descripcion != instance.descripcion

    if cambio_en_nombre or cambio_en_descripcion:
        entrada = construir_texto_embedding_proyecto(instance)
        if entrada:
            nuevo_embedding = obtener_embedding(entrada)
            if instance.embedding is None or not np.allclose(
                np.array(instance.embedding),
                np.array(nuevo_embedding),
                atol=1e-6
            ):
                instance.embedding = nuevo_embedding

@receiver(m2m_changed, sender=Proyecto.habilidades_requeridas.through)
def actualizar_embedding_de_proyecto_sobre_habilidades(sender, instance, action, **kwargs):
    """
    Actualiza la representación vectorial (embedding) para una instancia
    de proyecto si la tabla intermedia de habilidades requeridas del proyecto cambia.

    La señal es activada cuando las habilidades para el proyecto cambian a través
    de 'm2m_changed' (la relación muchos a muchos)

    Argumentos:
        sender (Model): La relación muchos a muchos entre proyecto y habilidades requeridas.
        instance (Proyecto): La instancia guardada del proyecto.
        action: La acción que activó la señal.
        **kwargs: Argumentos adicionales pasados por la señal.
    """
    if action in ["post_add", "post_remove", "post_clear"]:
        entrada = construir_texto_embedding_proyecto(instance)
        if entrada:
            nuevo_embedding = obtener_embedding(entrada)

            if instance.embedding is None or not np.allclose(
                np.array(instance.embedding),
                np.array(nuevo_embedding),
                atol=1e-6
            ):
                instance.embedding = nuevo_embedding
                instance.save(update_fields=["embedding"])