import { jwtDecode } from 'jwt-decode';
import { ACCESS_TOKEN } from './constants';
import api from './api';

export const obtenerUsuarioActual = () => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (!token) return null;

    try {
        return jwtDecode(token);
    } catch (err) {
        console.error('Invalid token', err);
        return null;
    }
}

export const isAuthenticated = () => {
    return !!obtenerUsuarioActual();
}

export const obtenerPerfilUsuario = async () => {
    try {
        const res = await api.get('/api/user/me/');
        return res.data;
    } catch (err) {
        console.error('Failed to fetch user profile:', err);
        return null;
    }
};