import { useState } from 'react'
import api from '../api'
import { useNavigate } from 'react-router-dom'
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants'
import '../styles/Form.css'
import LoadingIndicator from './LoadingIndicator'
import { obtenerPerfilUsuario } from '../auth'

/*
* Componente para formulario de registro e inicio de sesión
* Props:
*   route: ruta de la API para tokens de autenticación
*   method: método Http para le petición
*   setUser: función para actualizar el usuaio. Propiedad del componente padre
*/
function Form({ route, method, setUser }) {
    const [nombreUsuario, setNombreUsuario] = useState('')
    const [password, setPassword] = useState('')
    const [tipoUsuario, setTipoUsuario] = useState('')
    const [estado, setEstado] = useState('available')
    const [cargando, setCargando] = useState(false)
    // useNavigate permite cambiar rutas de manera programática
    const navigate = useNavigate()

    const titulo = method === 'login' ? 'Iniciar Sesión' : 'Registro'

    const handleSubmit = async (e) => {
        setCargando(true)
        // preventDefault evita el comportamiento por defecto al enviar el formulario.
        // En vez de recargar la página, vamos a controlar lo que sucede al enviar
        // el formulario.
        e.preventDefault()

        try {
            const payload = method === 'login'
                ? { username: nombreUsuario, password }
                : {
                      username: nombreUsuario,
                      password,
                      user_type: tipoUsuario,
                      status: estado,
                      interests: [],
                      abilities: [],
                  }

            const res = await api.post(route, payload)

            if (method === 'login') {
                localStorage.setItem(ACCESS_TOKEN, res.data.access)
                localStorage.setItem(REFRESH_TOKEN, res.data.refresh)
                const perfil = await obtenerPerfilUsuario();
                setUser?.(perfil);
                navigate('/')
            } else {
                navigate('/login')
            }
        } catch (error) {
            alert('Ocurrió un error durante el envío')
            console.error(error.response?.data || error)
        } finally {
            setCargando(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className='form-container'>
            <h1>{titulo}</h1>

            <input
                className='form-input'
                type="text"
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
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

            {/* Desplegar los siguientes componentes si el método es registrar usuario */}
            {method === 'register' && (
                <>
                    <select
                        className='form-input'
                        value={tipoUsuario}
                        onChange={(e) => setTipoUsuario(e.target.value)}
                        required
                    >
                        <option value="">Tipo de Usuario</option>
                        <option value="student">Estudiante</option>
                        <option value="mentor">Asesor</option>
                    </select>

                    <select
                        className='form-input'
                        value={estado}
                        onChange={(e) => setEstado(e.target.value)}
                    >
                        <option value="available">Buscando Proyecto</option>
                        <option value="enrolled">En un Proyecto</option>
                        <option value="inactive">No Estoy Buscando Proyecto</option>
                    </select>
                </>
            )}

            {cargando && <LoadingIndicator />}

            <button className='form-button' type='submit'>
                {titulo}
            </button>
        </form>
    );
}

export default Form;
