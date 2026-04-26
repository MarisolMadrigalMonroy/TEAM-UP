def actualizar_estado_proyecto(proyecto):
    """
    Determina y actualiza el estado del proyecto basado en su composición.
    """

    if proyecto.estado in ['cancelado', 'terminado']:
        return

    estudiantes_count = proyecto.estudiantes.count()
    tiene_asesor = proyecto.asesor is not None

    if estudiantes_count >= 3 and tiene_asesor:
        nuevo_estado = 'en_progreso'
    elif estudiantes_count >= 3:
        nuevo_estado = 'buscando_asesor'
    else:
        nuevo_estado = 'buscando_estudiantes'

    if proyecto.estado != nuevo_estado:
        proyecto.estado = nuevo_estado
        proyecto.save(update_fields=['estado'])