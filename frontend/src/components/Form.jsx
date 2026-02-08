import { useState } from 'react'
import api from '../api'
import { useNavigate } from 'react-router-dom'
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants'
import '../styles/Form.css'
import LoadingIndicator from './LoadingIndicator'
import { getCurrentUser } from '../auth'
import { fetchUserProfile } from '../auth'

function Form({ route, method, setUser }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [userType, setUserType] = useState('')
    const [status, setStatus] = useState('available')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const name = method === 'login' ? 'Iniciar Sesión' : 'Registro'

    const handleSubmit = async (e) => {
        setLoading(true)
        e.preventDefault()

        try {
            const payload = method === 'login'
                ? { username, password }
                : {
                      username,
                      password,
                      user_type: userType,
                      status,
                      interests: [],
                      abilities: [],
                  }

            const res = await api.post(route, payload)

            if (method === 'login') {
                localStorage.setItem(ACCESS_TOKEN, res.data.access)
                localStorage.setItem(REFRESH_TOKEN, res.data.refresh)
                const profile = await fetchUserProfile();
                setUser?.(profile);
                console.log('usu: ', getCurrentUser())
                navigate('/')
            } else {
                navigate('/login')
            }
        } catch (error) {
            alert('An error occurred during submission')
            console.error(error.response?.data || error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className='form-container'>
            <h1>{name}</h1>

            <input
                className='form-input'
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder='Nombre de Usuario'
                required
            />
            <input
                className='form-input'
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='Contraseña'
                required
            />

            {method === 'register' && (
                <>
                    <select
                        className='form-input'
                        value={userType}
                        onChange={(e) => setUserType(e.target.value)}
                        required
                    >
                        <option value="">Tipo de Usuario</option>
                        <option value="student">Estudiante</option>
                        <option value="mentor">Asesor</option>
                    </select>

                    <select
                        className='form-input'
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="available">Buscando Proyecto</option>
                        <option value="enrolled">En un Proyecto</option>
                        <option value="inactive">No Estoy Buscando Proyecto</option>
                    </select>
                </>
            )}

            {loading && <LoadingIndicator />}

            <button className='form-button' type='submit'>
                {name}
            </button>
        </form>
    );
}

export default Form;
