import React from 'react'
import '../styles/Note.css'

function Project({project, onDelete}) {
    const formattedDate = new Date(project.created_at).toLocaleDateString('en-US')
    return <div className='note-container'>
        <p className='note-title'>{project.name}</p>
        <p className='note-content'>{project.description}</p>
        <p className='note-date'>{formattedDate}</p>
        <button className='delete-button' onClick={() => onDelete(project.id)}>Delete</button>
    </div>
}

export default Project