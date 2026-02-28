import { Navigate } from 'react-router-dom'
import { jwtDecode } from 'jwt-decode'
import api from '../api'
import { REFRESH_TOKEN, ACCESS_TOKEN } from '../constants'
import { useState, useEffect } from 'react'

/*
 * Componente para rutas que necesitan autorización para desplegarse
*/
function ProtectedRoute({children}) {
    const [autorizado, setAutorizado] = useState(null)

    useEffect(() => {
        autorizar().catch(() => setAutorizado(false))
    }, [])

    // Función para actualizar token de acceso usando token de actualización
    const actualizarToken = async () => {
        const actualizarToken = localStorage.getItem(REFRESH_TOKEN)
        try {
            const res = await api.post('/api/token/refresh/', {refresh: actualizarToken})
            if (res.status === 200) {
                localStorage.setItem(ACCESS_TOKEN, res.data.access)
                setAutorizado(true)
            }
            else {
                setAutorizado(false)
            }
        } catch (error) {
            console.log(error)
            setAutorizado(false)
        }
    }

    // Función para autorizar acceso
    const autorizar = async () => {
        const token = localStorage.getItem(ACCESS_TOKEN)
        if (!token) {
            setAutorizado(false)
            return
        }
        const decodificado = jwtDecode(token)
        const expiracionToken = decodificado.exp
        const ahora = Date.now()/1000
        // Si la fecha de expiración del token es antes que ahora, actualizar token
        if (expiracionToken < ahora) {
            await actualizarToken()
        }
        else {
            setAutorizado(true)
        }
    }

    if (autorizado === null) {
        return <div>Cargando...</div>
    }

    return autorizado ? children : <Navigate to="/login" /> 
}

export default ProtectedRoute