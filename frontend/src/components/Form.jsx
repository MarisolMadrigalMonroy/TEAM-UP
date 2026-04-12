import { useState } from 'react'
import api from '../api'
import { useNavigate } from 'react-router-dom'
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants'
import '../styles/Form.css'
import LoadingIndicator from './LoadingIndicator'
import { obtenerPerfilUsuario } from '../auth'
import { Alert } from 'react-bootstrap'

function Form({ route, method, setUsuario }) {
    const [nombreUsuario, setNombreUsuario] = useState('')
    const [password, setPassword] = useState('')
    const [tipoUsuario, setTipoUsuario] = useState('')
    const [estado, setEstado] = useState('disponible')
    const [cargando, setCargando] = useState(false)
    const [errorMensaje, setErrorMensaje] = useState('')

    const navigate = useNavigate()

    const titulo = method === 'login' ? 'Iniciar Sesión' : 'Registro'
    //const usernameRegex = /^[a-zA-Z]{3,}\.[a-zA-Z]{3,}\d*@(?:alumnos|academicos)\.(udg)\.(mx)$/;

    const handleSubmit = async (e) => {
        e.preventDefault()
        setCargando(true)
        setErrorMensaje('')

        if (nombreUsuario.trim().length < 5) {
            setErrorMensaje('El nombre de usuario debe tener al menos 5 caracteres.');
            setCargando(false)
            return;
        }

        /*if (method === 'registro' && !usernameRegex.test(nombreUsuario)) {
            setErrorMensaje(
                'Usa tu correo institucional'
            );
            setCargando(false);
            return;
            }*/

        try {
            const payload =
                method === 'login'
                    ? { username: nombreUsuario, password }
                    : {
                          username: nombreUsuario,
                          password,
                          tipo_usuario: tipoUsuario,
                          estado: "disponible",
                          intereses: [],
                          habilidades: [],
                      }

            const res = await api.post(route, payload)

            if (method === 'login') {
                localStorage.setItem(ACCESS_TOKEN, res.data.access)
                localStorage.setItem(REFRESH_TOKEN, res.data.refresh)

                const perfil = await obtenerPerfilUsuario()
                setUsuario?.(perfil)

                navigate('/')
            } else {
                navigate('/login')
            }
        } catch (error) {
            if (error.response?.status === 401) {
                setErrorMensaje(
                    'Credenciales inválidas. Verifica tu usuario y contraseña.'
                )
            } else if (error.response?.status === 400) {
                const data = error.response?.data;
                const firstError = Object.values(data || {}).flat()?.[0];

                setErrorMensaje(
                    firstError || 'No se pudo completar la solicitud.'
                );
            } else {
                setErrorMensaje(
                    'Ocurrió un problema de conexión. Intenta nuevamente.'
                )
            }

            console.error(error.response?.data || error)
        } finally {
            setCargando(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="form-container">
            {errorMensaje && (
                <Alert
                    variant="danger"
                    dismissible
                    onClose={() => setErrorMensaje('')}
                >
                    {errorMensaje}
                </Alert>
            )}

            <h1>{titulo}</h1>

            <input
                className="form-input"
                type="text"
                maxLength={150}
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
                placeholder="Nombre de Usuario"
                required
            />

            <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                required
            />

            {method === 'registro' && (
                <>
                    <select
                        className="form-input"
                        value={tipoUsuario}
                        onChange={(e) => setTipoUsuario(e.target.value)}
                        required
                    >
                        <option value="">Tipo de Usuario</option>
                        <option value="estudiante">Estudiante</option>
                        <option value="asesor">Asesor</option>
                    </select>

                    {/*
                    <select
                        className="form-input"
                        value={estado}
                        onChange={(e) => setEstado(e.target.value)}
                    >
                        <option value="disponible">Buscando Proyecto</option>
                        <option value="registrado">En un Proyecto</option>
                        <option value="inactivo">No Estoy Buscando Proyecto</option>
                    </select> */}
                </>
            )}

            {cargando && <LoadingIndicator />}

            <button className="form-button" type="submit" disabled={cargando}>
                {cargando ? 'Procesando...' : titulo}
            </button>
        </form>
    )
}

export default Form