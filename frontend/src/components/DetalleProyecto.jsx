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
function ListaComentarios({ comentarios }) {
    return (
        <div className="mt-4">
            <h5>Comentarios</h5>
            {/* Si no hay comentarios desplegar texto de invitación en caso contrario mostrar lista de comentarios */}
            {comentarios.length === 0 ? (
                <p className="text-muted">No hay comentarios. ¡Sé el primero en comentar!</p>
            ) : (
                <>
                    {/* Para cada comentario crear una carta con icono de usuario, nombre, fecha y comentario */}
                    {comentarios.map(comentario => (
                        <Card key={comentario.id} className="mb-3 shadow-sm">
                            <Card.Body>
                                <Row>
                                    <Col xs={1} className="text-center">
                                        <FaUserCircle size={40} className="text-secondary" />
                                    </Col>
                                    <Col>
                                        <div className="d-flex justify-content-between">
                                            <strong>{comentario.autor_username}</strong>
                                            <small className="text-muted">
                                                {new Date(comentario.creado_en).toLocaleString()}
                                            </small>
                                        </div>
                                        <p className="mb-0">{comentario.contenido}</p>
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
function DetalleProyecto() {
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
            const [proyRes, usuarioRes] = await Promise.all([
                api.get(`/api/proyectos/${id}/`),
                obtenerPerfilUsuario()
            ]);
            setProyecto(proyRes.data);
            setUsuarioActual(usuarioRes);

            if (proyRes.data.tiene_like) {
                setLiked(true);
            }
        } catch (err) {
            console.error('Error obteniendo el proyecto:', err);
        }
    };

    // Función para obtener comentarios del proyecto
    const obtenerComentarios = async () => {
        try {
            const res = await api.get(`/api/proyectos/${id}/comentarios/`);
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
            const res = await api.post(`/api/proyectos/${id}/comentarios/`, {
                contenido: nuevoComentario,
                proyecto: id,
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
            const res = await api.post(`/api/match/like-proyecto/`, {
                proyecto: proyecto.id,
                gustado: true,
            });
            setLiked(true);
            // Si hay un emparejamiento entre usuario y proyecto, mostrar notificación
            if (res.data.emparejado && res.data.emparejado_con) {
                toast.success(`🎉 Hiciste match con ${res.data.emparejado_con} en "${proyecto.nombre}"!`);
            } else {
                toast.info(`Te gusta "${proyecto.nombre}"`);
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
        (usuarioActual.id === proyecto.creador || usuarioActual.id === proyecto.asesor?.id);

    return (
        <Container fluid className="py-5 px-4">
            <Row className="justify-content-center">
                <Col lg={10} xl={9}>
                    {/* Encabezado tipo blog */}
                    <header className="pb-3 mb-4 border-bottom">
                        <h1 className="display-4">{proyecto.nombre}</h1>
                        <p className="lead">{proyecto.descripcion}</p>
                    </header>

                    <Row>
                        {/* Izquierda: Comentarios + Formulario */}
                        <Col md={8}>
                            <ListaComentarios comentarios={comentarios} />
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
                                            {proyecto.asesor ? proyecto.asesor.username : 'Ninguno'}
                                        </ListGroup.Item>
                                        <ListGroup.Item>
                                        <strong>Estudiantes:</strong>
                                        {proyecto.estudiantes?.length > 0 ? (
                                            <ul className="list-unstyled mt-2">
                                            {proyecto.estudiantes.map(estudiante => {
                                                const esCreador = estudiante.id === proyecto.creador;
                                                const esAsesor = proyecto.asesor && estudiante.id === proyecto.asesor.id;

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
                                                            await api.post(`/api/proyectos/${proyecto.id}/remover-usuario/`, {
                                                            usuario_id: estudiante.id,
                                                            });
                                                            setProyecto(prev => ({
                                                            ...prev,
                                                            estudiantes: prev.estudiantes.filter(u => u.id !== estudiante.id),
                                                            estado:
                                                                prev.estudiantes.length - 1 < 3 && prev.estado === "equipo_completo"
                                                                ? "buscando_estudiantes"
                                                                : prev.estado,
                                                            }));
                                                        } catch (err) {
                                                            console.error("Error removiendo al estudiante:", err);
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
                                            {proyecto.detalles_categorias?.map(cat => cat.nombre).join(', ') || 'Ninguna'}
                                        </ListGroup.Item>
                                        <ListGroup.Item>
                                            <strong>Habilidades Requeridas:</strong>{' '}
                                            {proyecto.detalles_habilidades_requeridas?.map(hab => hab.nombre).join(', ') || 'Ninguna'}
                                        </ListGroup.Item>
                                        {/* Si es creador o asesor puede editar proyectos, ver estudiantes y asesores con match */}
                                        {esCreadorOAsesor && (
                                            <>
                                                <ListGroupItem>
                                                    <Link to={`/proyectos/${proyecto.id}/editar`} className="btn btn-primary mt-3 w-100">
                                                        Editar Proyecto
                                                    </Link>
                                                </ListGroupItem>
                                                <ListGroupItem>
                                                    <Link to={`/proyectos/${proyecto.id}/usuarios-emparejados`} className="btn btn-outline-success mt-2 w-100">
                                                        Ver Estudintes con Match
                                                    </Link>
                                                </ListGroupItem>
                                                <ListGroupItem>
                                                    <Link to={`/proyectos/${proyecto.id}/asesores-emparejados`} className="btn btn-outline-info mt-2 w-100">
                                                        Ver Asesores con Match
                                                    </Link>
                                                </ListGroupItem>
                                            </>
                                        )}
                                    </ListGroup>
                                    {sesionIniciada && (() => {
                                        const esEstudiante = usuarioActual?.tipo_usuario === "estudiante";
                                        const esAsesor = usuarioActual?.tipo_usuario === "asesor";
                                        const esPropietario = usuarioActual?.id === proyecto.creador;
                                        const esEstudianteEnUnProyecto = esEstudiante && usuarioActual?.proyectos?.length > 0;

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

export default DetalleProyecto;
