import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'
import ProjectDetail from './components/ProjectDetail'
import NavigationBar from './components/NavBar'
import { obtenerUsuarioActual } from './auth'
import EditProfile from './pages/EditProfile'
import EditProject from './pages/EditProject'
import CreateProject from './pages/CreateProject'
import { useEffect, useState } from 'react'
import Form from './components/Form'
import Logout from './components/Logout'
import { obtenerPerfilUsuario } from './auth';
import Projects from './pages/Projects';
import MatchPage from './pages/MatchPage';
import NotificationsPage from './pages/NotificationsPage'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MatchedUsers from "./pages/MatchedUsers";
import MatchedMentors from "./pages/MatchedMentors";

/*
* Componente principal de la aplicación
*/
function App() {
  const [user, setUser] = useState(obtenerUsuarioActual());

  useEffect(() => {
    async function cargarUsuario() {
      const perfilUsuario = await obtenerPerfilUsuario();
      setUser(perfilUsuario);
    }

    cargarUsuario();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <BrowserRouter>
    {/* Barra de navegación */}
    <NavigationBar user={user} setUser={setUser} isAuthenticated={!!user} onLogout={handleLogout} />
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
            <Form route='/api/token/' method='login' setUser={setUser} /> 
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
          path='/register'
          element={
            <Form route='/api/user/register/' method='register' setUser={setUser} />
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
          path="/projects/:id" 
          element={
            <ProjectDetail />
          } 
        />
        {/* Editar perfil */}
        <Route 
          path="/profile/edit" 
          element={
            <EditProfile />
          } 
        />
        {/* Crear proyecto */}
        <Route 
          path="/projects/create" 
          element={
            <ProtectedRoute>
              <CreateProject setUser={setUser} />
            </ProtectedRoute>
          } 
        />
        {/* Editar proyecto */}
        <Route 
          path="/projects/:id/edit" 
          element={
            <ProtectedRoute>
              <EditProject user={user}/>
            </ProtectedRoute>
          } 
        />
        {/* Proyectos */}
        <Route 
          path="/projects" 
          element={
            <Projects />
          } 
        />
        {/* Encontrar un match */}
        <Route 
          path="/match" 
          element={
            <MatchPage user={user} />
          } 
        />
        {/* Notificaciones */}
        <Route 
          path="/notifications" 
          element={
            <NotificationsPage />
          } 
        />
        {/* Usuarios con match */}
        <Route
          path="/projects/:id/matched-users"
          element={
            <MatchedUsers />
          }
        />
        {/* Asesores con match */}
        <Route 
          path="/projects/:id/matched-mentors"
          element={
            <MatchedMentors />
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
