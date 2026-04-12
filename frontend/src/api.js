import axios from 'axios'
import { ACCESS_TOKEN } from './constants'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Accept-Language': 'es',
    },
})

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(ACCESS_TOKEN)
        if (token) {
            try {
                const { exp } = JSON.parse(atob(token.split('.')[1]));
                if (Date.now() >= exp * 1000) {
                    localStorage.removeItem(ACCESS_TOKEN);
                    return config; 
                }
                config.headers.Authorization = `Bearer ${token}`
            } catch(err) {
                console.error('Formato de token invalido:', err);
                localStorage.removeItem(ACCESS_TOKEN);
            }
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

export default api