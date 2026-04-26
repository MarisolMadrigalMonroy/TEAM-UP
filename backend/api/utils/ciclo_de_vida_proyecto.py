# backend/api/utils/ciclo_de_vida_proyecto.py

from api.models import (
    Proyecto,
    Match,
    InteresSobreUsuario,
    InteresSobreProyecto,
    Notificacion,
)

def cancelar_proyecto(proyecto):
    if proyecto.estado == "cancelado":
        return
    
    estudiantes = list(proyecto.estudiantes.all())
    asesor = proyecto.asesor

    # liberar estudiantes
    for estudiante in estudiantes:
        estudiante.estado = "disponible"
        estudiante.save(update_fields=["estado"])

        Notificacion.objects.create(
            receptor=estudiante,
            mensaje=f'El proyecto "{proyecto.nombre}" fue cancelado.',
            proyecto_relacionado=proyecto
        )

    # liberar asesor
    if asesor:
        otros_proyectos = Proyecto.objects.filter(
            asesor=asesor
        ).exclude(id=proyecto.id).exists()

        asesor.estado = (
            "registrado" if otros_proyectos else "disponible"
        )
        asesor.save()

        Notificacion.objects.create(
            receptor=asesor,
            mensaje=f'El proyecto "{proyecto.nombre}" fue cancelado.',
            proyecto_relacionado=proyecto
        )

    # limpiar participantes
    proyecto.estudiantes.clear()
    proyecto.asesor = None
    proyecto.estado = "cancelado"
    proyecto.save()

    # limpiar intereses y matches
    InteresSobreUsuario.objects.filter(proyecto=proyecto).delete()
    InteresSobreProyecto.objects.filter(proyecto=proyecto).delete()
    Match.objects.filter(proyecto=proyecto).delete()