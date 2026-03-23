import React from 'react'
import '../styles/Note.css'

function Proyecto({proyecto, onDelete}) {
    const formattedDate = new Date(proyecto.creado_en).toLocaleDateString('en-US')
    return <div className='note-container'>
        <p className='note-title'>{proyecto.nombre}</p>
        <p className='note-content'>{proyecto.descripcion}</p>
        <p className='note-date'>{formattedDate}</p>
        <button className='delete-button' onClick={() => onDelete(proyecto.id)}>Borrar</button>
    </div>
}

export default Proyecto