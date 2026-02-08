import react from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import EditPrfile from './pages/EditProfile'
import ProtectedRoute from './components/ProtectedRoute'
import ProjectDetail from './components/ProjectDetail'
import NavigationBar from './components/NavBar'
import { getCurrentUser } from './auth'
import EditProfile from './pages/EditProfile'
import EditProject from './pages/EditProject'
import CreateProject from './pages/CreateProject'
import React, { useEffect, useState } from 'react'
import Form from './components/Form'
import Logout from './components/Logout'
import { fetchUserProfile } from './auth';
import Projects from './pages/Projects';
import MatchPage from './pages/MatchPage';
import NotificationsPage from './pages/NotificationsPage'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MatchedUsers from "./pages/MatchedUsers";
import MatchedMentors from "./pages/MatchedMentors";

function App() {
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    async function loadUser() {
      const userProfile = await fetchUserProfile();
      setUser(userProfile);
    }

    loadUser();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <BrowserRouter>
    <NavigationBar user={user} setUser={setUser} isAuthenticated={!!user} onLogout={handleLogout} />
    <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route
          path='/'
          element={
              <Home /> 
          } 
        />
        <Route
          path='/login'
          element={
            <Form route='/api/token/' method='login' setUser={setUser} /> 
          } 
        />
        <Route
          path='/logout'
          element={
            <Logout onLogout={handleLogout} />  
          } 
        />
        <Route
          path='/register'
          element={
            <Form route='/api/user/register/' method='register' setUser={setUser} />
          } 
        />
        <Route
          path='*'
          element={
            <NotFound />
          } 
        />
        <Route 
          path="/projects/:id" 
          element={
            <ProjectDetail />
          } 
        />
        <Route 
          path="/profile/edit" 
          element={
            <EditProfile />
          } 
        />
        <Route 
          path="/projects/create" 
          element={
            <ProtectedRoute>
              <CreateProject setUser={setUser} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/projects/:id/edit" 
          element={
            <ProtectedRoute>
              <EditProject user={user}/>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/projects" 
          element={
            <Projects />
          } 
        />
        <Route 
          path="/match" 
          element={
            <MatchPage user={user} />
          } 
        />
        <Route 
          path="/notifications" 
          element={
            <NotificationsPage />
          } 
        />
        <Route
          path="/projects/:id/matched-users"
          element={
            <MatchedUsers />
          }
        />
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
