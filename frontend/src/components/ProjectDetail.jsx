import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Container, Spinner, Card, ListGroup, Form, Button, Row, Col,
    ListGroupItem
} from 'react-bootstrap';
import { FaUserCircle } from 'react-icons/fa';
import api from '../api';
    import { obtenerUsuarioActual } from '../auth';
import { obtenerPerfilUsuario } from '../auth';
import { toast } from 'react-toastify';

/*
* Componente para lista de comentarios
*/
function ListaComentarios({ commentarios }) {
    return (
        <div className="mt-4">
            <h5>Comentarios</h5>
            {/* Si no hay comentarios desplegar texto de invitación en caso contrario mostrar lista de comentarios */}
            {commentarios.length === 0 ? (
                <p className="text-muted">No hay comentarios. ¡Sé el primero en comentar!</p>
            ) : (
                <>
                    {/* Para cada comentario crear una carta con icono de usuario, nombre, fecha y comentario */}
                    {commentarios.map(commentario => (
                        <Card key={commentario.id} className="mb-3 shadow-sm">
                            <Card.Body>
                                <Row>
                                    <Col xs={1} className="text-center">
                                        <FaUserCircle size={40} className="text-secondary" />
                                    </Col>
                                    <Col>
                                        <div className="d-flex justify-content-between">
                                            <strong>{commentario.author_username}</strong>
                                            <small className="text-muted">
                                                {new Date(commentario.created_at).toLocaleString()}
                                            </small>
                                        </div>
                                        <p className="mb-0">{commentario.content}</p>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    ))}
                </>
            )}
        </div>
    );
}

/*
* Componente para detalles del proyecto
*/
function ProjectDetail() {
    const usuario = obtenerUsuarioActual();
    const sesionIniciada = !!usuario;
    const { id } = useParams(); // id del proyecto desde la url
    const [proyecto, setProyecto] = useState(null);
    const [comentarios, setComentarios] = useState([]);
    const [nuevoComentario, setNuevoComentario] = useState('');
    const [cargando, setCargando] = useState(true);
    const [publicando, setPublicando] = useState(false);
    const [usuarioActual, setUsuarioActual] = useState(null);
    const [liked, setLiked] = useState(false);

    // Función para obtener el proyecto
    const obtenerProyecto = async () => {
        try {
            const [proyRes, userRes] = await Promise.all([
                api.get(`/api/projects/${id}/`),
                obtenerPerfilUsuario()
            ]);
            setProyecto(proyRes.data);
            setUsuarioActual(userRes);

            if (proyRes.data.has_liked) {
                setLiked(true);
            }
        } catch (err) {
            console.error('Error obteniendo el proyecto:', err);
        }
    };

    // Función para obtener comentarios del proyecto
    const obtenerComentarios = async () => {
        try {
            const res = await api.get(`/api/projects/${id}/comments/`);
            setComentarios(res.data);
        } catch (err) {
            console.error('Error obteniendo los comentarios:', err);
        }
    };

    useEffect(() => {
        const init = async () => {
            setCargando(true);
            await obtenerProyecto();
            await obtenerComentarios();
            setCargando(false);
        };
        init();
    }, [id]);

    // Función para controlar la publicación de un comentario
    const handlePostComment = async (e) => {
        e.preventDefault();
        // Si el comentario está vacío regresamos, sino procedemos con la publicación
        if (!nuevoComentario.trim()) return;
        setPublicando(true);
        try {
            const res = await api.post(`/api/projects/${id}/comments/`, {
                content: nuevoComentario,
                project: id,
            });
            setComentarios([...comentarios, res.data]);
            setNuevoComentario('');
        } catch (err) {
            console.error('Error publicando comentario:', err);
        } finally {
            setPublicando(false);
        }
    };

    // Función para controlar la acción de me gusta en un proyecto
    const handleLike = async () => {
        try {
            const res = await api.post(`/api/match/like-project/`, {
                project: proyecto.id,
                liked: true,
            });
            setLiked(true);
            // Si hay un emparejamiento entre usuario y proyecto, mostrar notificación
            if (res.data.matched && res.data.match_with) {
                toast.success(`🎉 Hiciste match con ${res.data.match_with} en "${proyecto.name}"!`);
            } else {
                toast.info(`Te gusta "${proyecto.name}"`);
            }
        } catch (err) {
            console.error("Error al darle me gusta al proyecto:", err);
            toast.error("Algo salió mal al darle me gusta al proyecto.");
        }
    };

    if (cargando) {
        return (
            <div className="text-center my-5">
                <Spinner animation="border" />
            </div>
        );
    }

    // Variable para saber si el usuario es el creador o asesor del proyecto
    const esCreadorOAsesor =
        usuarioActual &&
        (usuarioActual.id === proyecto.creator || usuarioActual.id === proyecto.mentor?.id);

    return (
        <Container fluid className="py-5 px-4">
            <Row className="justify-content-center">
                <Col lg={10} xl={9}>
                    {/* Encabezado tipo blog */}
                    <header className="pb-3 mb-4 border-bottom">
                        <h1 className="display-4">{proyecto.name}</h1>
                        <p className="lead">{proyecto.description}</p>
                    </header>

                    <Row>
                        {/* Izquierda: Comentarios + Formulario */}
                        <Col md={8}>
                            <ListaComentarios commentarios={comentarios} />
                            {sesionIniciada && (
                                <div className="position-sticky bottom-0 bg-white p-3 border-top">
                                    <Form onSubmit={handlePostComment}>
                                        <Form.Group className="mb-2">
                                            <Form.Label>Agrega un comentario</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                value={nuevoComentario}
                                                onChange={(e) => setNuevoComentario(e.target.value)}
                                                placeholder="Escribe tu comentario aquí..."
                                            />
                                        </Form.Group>
                                        <Button type="submit" disabled={publicando}>
                                            {publicando ? 'Publicando...' : 'Publicar Comentario'}
                                        </Button>
                                    </Form>
                                </div>
                            )}
                        </Col>

                        {/* Derecha: Detalles del proyecto */}
                        <Col md={4}>
                            <div className="position-sticky top-0" style={{ zIndex: 1 }}>
                                <Card className="shadow-sm">
                                    <Card.Header>Detalles del Proyecto</Card.Header>
                                    <ListGroup variant="flush">
                                        <ListGroup.Item>
                                            <strong>Asesor:</strong>{' '}
                                            {proyecto.mentor ? proyecto.mentor.username : 'Ninguno'}
                                        </ListGroup.Item>
                                        <ListGroup.Item>
                                        <strong>Estudiantes:</strong>
                                        {proyecto.students?.length > 0 ? (
                                            <ul className="list-unstyled mt-2">
                                            {proyecto.students.map(estudiante => {
                                                const esCreador = estudiante.id === proyecto.creator;
                                                const esAsesor = proyecto.mentor && estudiante.id === proyecto.mentor.id;

                                                return (
                                                <li
                                                    key={estudiante.id}
                                                    className="d-flex justify-content-between align-items-center mb-2"
                                                >
                                                    <span>{estudiante.username}</span>
                                                    {esCreador || esAsesor ? (
                                                    <span className="badge bg-info">{esCreador ? "Creador" : "Asesor"}</span>
                                                    ) : esCreadorOAsesor ? (
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={async () => {
                                                        try {
                                                            await api.post(`/api/projects/${proyecto.id}/unassign-user/`, {
                                                            user_id: estudiante.id,
                                                            });
                                                            setProyecto(prev => ({
                                                            ...prev,
                                                            students: prev.students.filter(u => u.id !== estudiante.id),
                                                            status:
                                                                prev.students.length - 1 < 3 && prev.status === "team_complete"
                                                                ? "looking_students"
                                                                : prev.status,
                                                            }));
                                                        } catch (err) {
                                                            console.error("Error removiando al estudiante:", err);
                                                        }
                                                        }}
                                                    >
                                                        Remover
                                                    </Button>
                                                    ) : null}
                                                </li>
                                                );
                                            })}
                                            </ul>
                                        ) : (
                                            <span> Ninguno</span>
                                        )}
                                        </ListGroup.Item>
                                        <ListGroup.Item>
                                            <strong>Categorías:</strong>{' '}
                                            {proyecto.categories_details?.map(cat => cat.name).join(', ') || 'Ninguna'}
                                        </ListGroup.Item>
                                        <ListGroup.Item>
                                            <strong>Habilidades Requeridas:</strong>{' '}
                                            {proyecto.required_abilities_details?.map(ab => ab.name).join(', ') || 'Ninguna'}
                                        </ListGroup.Item>
                                        {/* Si es creador o asesor puede editar proyectos, ver estudiantes y asesores con match */}
                                        {esCreadorOAsesor && (
                                            <>
                                                <ListGroupItem>
                                                    <Link to={`/projects/${proyecto.id}/edit`} className="btn btn-primary mt-3 w-100">
                                                        Editar Proyecto
                                                    </Link>
                                                </ListGroupItem>
                                                <ListGroupItem>
                                                    <Link to={`/projects/${proyecto.id}/matched-users`} className="btn btn-outline-success mt-2 w-100">
                                                        Ver Estudintes con Match
                                                    </Link>
                                                </ListGroupItem>
                                                <ListGroupItem>
                                                    <Link to={`/projects/${proyecto.id}/matched-mentors`} className="btn btn-outline-info mt-2 w-100">
                                                        Ver Asesores con Match
                                                    </Link>
                                                </ListGroupItem>
                                            </>
                                        )}
                                    </ListGroup>
                                    {sesionIniciada && (() => {
                                        const esEstudiante = usuarioActual?.user_type === "student";
                                        const esAsesor = usuarioActual?.user_type === "mentor";
                                        const esPropietario = usuarioActual?.id === proyecto.creator;
                                        const esEstudianteEnUnProyecto = esEstudiante && usuarioActual?.projects?.length > 0;

                                        if (esPropietario) return null;

                                        if (esEstudianteEnUnProyecto) return null;

                                        if (liked) {
                                            return (
                                            <ListGroupItem>
                                                <Button variant="success" className="mt-3 w-100" disabled>
                                                ❤️ Te Gusta
                                                </Button>
                                            </ListGroupItem>
                                            );
                                        }

                                        if (esAsesor || esEstudiante) {
                                            return (
                                            <ListGroupItem>
                                                <Button
                                                variant="outline-success"
                                                className="mt-3 w-100"
                                                onClick={handleLike}
                                                >
                                                Me Gusta ❤️
                                                </Button>
                                            </ListGroupItem>
                                            );
                                        }

                                        return null;
                                    })()}
                                </Card>
                            </div>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </Container>
    );
}

export default ProjectDetail;
