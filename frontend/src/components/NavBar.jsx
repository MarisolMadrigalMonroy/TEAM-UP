// components/NavBar.js
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../api';
import NotificationsDropdown from './NotificationsDropdown';

function NavigationBar({ isAuthenticated, user, setUser, onLogout }) {
    const navigate = useNavigate();
    console.log('usua: ', user)

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        }
        navigate('/login');
    };

    return (
        <Navbar bg="light" expand="lg" className="shadow-sm mb-4">
            <Container fluid className="px-4">
                <Navbar.Brand as={Link} to="/">TEAM-UP</Navbar.Brand>
                <Navbar.Toggle aria-controls="main-navbar" />
                <Navbar.Collapse id="main-navbar">
                    <Nav className="me-auto">
                        <Nav.Link as={Link} to="/">Home</Nav.Link>
                        <Nav.Link as={Link} to="/projects">Proyectos</Nav.Link>
                        {isAuthenticated && (
                            (user?.user_type === 'mentor' || (user?.user_type === 'student' && user?.projects?.length === 0)) && (
                                <Nav.Link as={Link} to="/projects/create">Crea Un Proyecto</Nav.Link>
                            )
                        )}
                        {isAuthenticated && (
                            <Nav.Link as={Link} to="/match">Encuentra Un Match</Nav.Link>
                        )}

                    </Nav>
                    <Nav>
                        {!isAuthenticated ? (
                            <>
                                <Nav.Link as={Link} to="/login">Inicia Sesión</Nav.Link>
                                <Nav.Link as={Link} to="/register">Registro</Nav.Link>
                            </>
                        ) : (
                            <>
                            <NotificationsDropdown />
                            <NavDropdown title="Cuenta" id="account-dropdown" align="end">
                                <NavDropdown.Item as={Link} to="/profile/edit">Perfil</NavDropdown.Item>
                                <NavDropdown.Divider />
                                <NavDropdown.Item onClick={handleLogout}>Salir</NavDropdown.Item>
                            </NavDropdown>
                            </>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}

export default NavigationBar;
