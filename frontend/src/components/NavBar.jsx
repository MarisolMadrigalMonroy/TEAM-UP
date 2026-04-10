// components/NavBar.js
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import NotificationsDropdown from './NotificationsDropdown';

function NavigationBar({
    isAuthenticated,
    usuario,
    setUsuario,
    onLogout,
    notificaciones,
    setNotificaciones,
    refrescarNotificaciones
}) {
    const navigate = useNavigate();

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
                        <Nav.Link as={Link} to="/proyectos">Proyectos</Nav.Link>
                        {/* Si el usuario está autenticado y es asesor o no tiene proyecto, puede crear un proyecto */}
                        {isAuthenticated && (
                            (usuario?.tipo_usuario === 'asesor' || (usuario?.tipo_usuario === 'estudiante' && usuario?.proyectos?.length === 0)) && (
                                <Nav.Link as={Link} to="/proyectos/crear">Crea Un Proyecto</Nav.Link>
                            )
                        )}
                        {/* Si el usuario está autenticado y tiene proyectos, puede ver sus proyectos */}
                        {isAuthenticated && (
                            (usuario?.tipo_usuario === 'asesor' || usuario?.proyectos?.length > 0) && (
                                <Nav.Link as={Link} to="/mis-proyectos">Mis Proyectos</Nav.Link>
                            )
                        )}
                        {/* Si está autenticado puede buscar un match */}
                        {isAuthenticated && (
                            <Nav.Link as={Link} to="/match">Encuentra Un Match</Nav.Link>
                        )}

                    </Nav>
                    <Nav>
                        {/* Si no está autenticado puede iniciar sesión o registrarse, en caso contrario puede ver su perfil o salir */}
                        {!isAuthenticated ? (
                            <>
                                <Nav.Link as={Link} to="/login">Inicia Sesión</Nav.Link>
                                <Nav.Link as={Link} to="/registro">Registro</Nav.Link>
                            </>
                        ) : (
                            <>
                            <NotificationsDropdown
                                notificaciones={notificaciones}
                                setNotificaciones={setNotificaciones}
                                refrescarNotificaciones={refrescarNotificaciones}
                            />
                            <NavDropdown title="Cuenta" id="account-dropdown" align="end">
                                <NavDropdown.Item as={Link} to="/perfil/editar">Perfil</NavDropdown.Item>
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
