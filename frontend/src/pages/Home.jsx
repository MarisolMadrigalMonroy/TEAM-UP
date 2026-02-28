import { useState, useEffect } from 'react'
import api from '../api'
import Project from '../components/Project'
import HomeShowcase from '../components/HomeShowcase'

function Home() {
    const [projects, setProjects] = useState([])
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [mentor, setMentor] = useState()
    const [students, setStudents] = useState([])
    const [categories, setCategories] = useState([])
    const [requiredAbilities, setRequiredAbilities] = useState([])

    return <HomeShowcase />
}

export default Home