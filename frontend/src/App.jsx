import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'
import DetalleProyecto from './components/DetalleProyecto'
import NavigationBar from './components/NavBar'
import { obtenerUsuarioActual } from './auth'
import EditarPerfil from './pages/EditarPerfil'
import EditarProyecto from './pages/EditarProyecto'
import CrearProyecto from './pages/CrearProyecto'
import { useEffect, useState } from 'react'
import Form from './components/Form'
import Logout from './components/Logout'
import { obtenerPerfilUsuario } from './auth';
import Proyectos from './pages/Proyectos';
import PaginaMatch from './pages/PaginaMatch';
import PaginaNotificaciones from './pages/PaginaNotificaciones'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UsuariosEmparejados from "./pages/UsuariosEmparejados";
import AsesoresEmparejados from "./pages/AsesoresEmparejados";
import MisProyectos from './pages/MisProyectos'
import api from './api';
import PerfilPublico from "./pages/PerfilPublico";

/*
* Componente principal de la aplicación
*/
function App() {
  const [usuario, setUsuario] = useState(obtenerUsuarioActual());
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargandoNotificaciones, setCargandoNotificaciones] = useState(false);

  const obtenerNotificaciones = async () => {
    if (!usuario) return;

    setCargandoNotificaciones(true);

    try {
      const res = await api.get('/api/notificaciones/');
      setNotificaciones(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
      setNotificaciones([]);
    } finally {
      setCargandoNotificaciones(false);
    }
  };

  useEffect(() => {
    if (usuario) {
      obtenerNotificaciones();
    }
  }, [usuario]);

  useEffect(() => {
    async function cargarUsuario() {
      const perfilUsuario = await obtenerPerfilUsuario();
      setUsuario(perfilUsuario);
    }

    cargarUsuario();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUsuario(null);
  };

  return (
    <BrowserRouter>
      {/* Barra de navegación */}
      <NavigationBar
        usuario={usuario}
        setUsuario={setUsuario}
        isAuthenticated={!!usuario}
        onLogout={handleLogout}
        notificaciones={notificaciones}
        setNotificaciones={setNotificaciones}
        refrescarNotificaciones={obtenerNotificaciones}
      />
      {/* Contenedor de notificaciones */}
      <ToastContainer position="top-right" autoClose={3000} />
      {/* Colección de rutas */}
      <Routes>
        {/* Home */}
        <Route
          path='/'
          element={
            <Home /> 
          } 
        />
        {/* Inició de sesión */}
        <Route
          path='/login'
          element={
            <Form route='/api/token/' method='login' setUsuario={setUsuario} /> 
          } 
        />
        {/* Cierre de sesión */}
        <Route
          path='/logout'
          element={
            <Logout onLogout={handleLogout} />  
          } 
        />
        {/* Registro */}
        <Route
          path='/registro'
          element={
            <Form route='/api/usuario/registro/' method='registro' setUsuario={setUsuario} />
          } 
        />
        {/* No encontrado */}
        <Route
          path='*'
          element={
            <NotFound />
          } 
        />
        {/* Detalle de proyecto */}
        <Route 
          path="/proyectos/:id" 
          element={
            <DetalleProyecto refrescarNotificaciones={obtenerNotificaciones} />
          } 
        />
        {/* Editar perfil */}
        <Route 
          path="/perfil/editar" 
          element={
            <ProtectedRoute>
              <EditarPerfil />
            </ProtectedRoute>
          } 
        />
        {/* Crear proyecto */}
        <Route 
          path="/proyectos/crear" 
          element={
            <ProtectedRoute>
              <CrearProyecto setUsuario={setUsuario} />
            </ProtectedRoute>
          } 
        />
        {/* Editar proyecto */}
        <Route 
          path="/proyectos/:id/editar" 
          element={
            <ProtectedRoute>
              <EditarProyecto usuario={usuario}/>
            </ProtectedRoute>
          } 
        />
        {/* Proyectos */}
        <Route 
          path="/proyectos" 
          element={
            <Proyectos />
          } 
        />
        {/* Encontrar un match */}
        <Route 
          path="/match" 
          element={
            <ProtectedRoute>
              <PaginaMatch
                usuario={usuario}
                refrescarNotificaciones={obtenerNotificaciones}
              />
            </ProtectedRoute>
          } 
        />
        {/* Notificaciones */}
        <Route 
          path="/notificaciones" 
          element={
            <ProtectedRoute>
              <PaginaNotificaciones
                notificaciones={notificaciones}
                setNotificaciones={setNotificaciones}
                refrescarNotificaciones={obtenerNotificaciones}
              />
            </ProtectedRoute>
          } 
        />
        {/* Usuarios con match */}
        <Route
          path="/proyectos/:id/usuarios-emparejados"
          element={
            <ProtectedRoute>
              <UsuariosEmparejados
                refrescarNotificaciones={obtenerNotificaciones}
              />
            </ProtectedRoute>
          }
        />
        {/* Asesores con match */}
        <Route 
          path="/proyectos/:id/asesores-emparejados"
          element={
            <ProtectedRoute>
              <AsesoresEmparejados
                refrescarNotificaciones={obtenerNotificaciones}
              />
            </ProtectedRoute>
          } 
        />
        {/* Crear proyecto */}
        <Route 
          path="/mis-proyectos" 
          element={
            <ProtectedRoute>
              <MisProyectos usuario={usuario} />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/usuarios/:id"
          element={
            <ProtectedRoute>
              <PerfilPublico
                usuario={usuario}
                refrescarNotificaciones={obtenerNotificaciones}
              />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
