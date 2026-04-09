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

/*
* Componente principal de la aplicación
*/
function App() {
  const [usuario, setUsuario] = useState(obtenerUsuarioActual());

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
    <NavigationBar usuario={usuario} setUsuario={setUsuario} isAuthenticated={!!usuario} onLogout={handleLogout} />
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
            <DetalleProyecto />
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
              <PaginaMatch usuario={usuario} />
            </ProtectedRoute>
          } 
        />
        {/* Notificaciones */}
        <Route 
          path="/notificaciones" 
          element={
            <ProtectedRoute>
              <PaginaNotificaciones />
            </ProtectedRoute>
          } 
        />
        {/* Usuarios con match */}
        <Route
          path="/proyectos/:id/usuarios-emparejados"
          element={
            <ProtectedRoute>
              <UsuariosEmparejados />
            </ProtectedRoute>
          }
        />
        {/* Asesores con match */}
        <Route 
          path="/proyectos/:id/asesores-emparejados"
          element={
            <ProtectedRoute>
              <AsesoresEmparejados />
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
      </Routes>
    </BrowserRouter>
  )
}

export default App
