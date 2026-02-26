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

function CommentList({ comments }) {
    return (
        <div className="mt-4">
            <h5>Comentarios</h5>
            {comments.length === 0 ? (
                <p className="text-muted">No hay comentarios. ¡Sé el primero en comentar!</p>
            ) : (
                <>
                    {comments.map(comment => (
                        <Card key={comment.id} className="mb-3 shadow-sm">
                            <Card.Body>
                                <Row>
                                    <Col xs={1} className="text-center">
                                        <FaUserCircle size={40} className="text-secondary" />
                                    </Col>
                                    <Col>
                                        <div className="d-flex justify-content-between">
                                            <strong>{comment.author_username}</strong>
                                            <small className="text-muted">
                                                {new Date(comment.created_at).toLocaleString()}
                                            </small>
                                        </div>
                                        <p className="mb-0">{comment.content}</p>
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

function ProjectDetail() {
    const user = obtenerUsuarioActual();
    const isLoggedIn = !!user;
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [liked, setLiked] = useState(false);

    const fetchProject = async () => {
        try {
            const [projRes, userRes] = await Promise.all([
                api.get(`/api/projects/${id}/`),
                obtenerPerfilUsuario()
            ]);
            setProject(projRes.data);
            setCurrentUser(userRes);

            if (projRes.data.has_liked) {
                setLiked(true);
            }
        } catch (err) {
            console.error('Error fetching project:', err);
        }
    };

    const fetchComments = async () => {
        try {
            const res = await api.get(`/api/projects/${id}/comments/`);
            setComments(res.data);
        } catch (err) {
            console.error('Error fetching comments:', err);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchProject();
            await fetchComments();
            setLoading(false);
        };
        init();
    }, [id]);

    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setPosting(true);
        try {
            const res = await api.post(`/api/projects/${id}/comments/`, {
                content: newComment,
                project: id,
            });
            setComments([...comments, res.data]);
            setNewComment('');
        } catch (err) {
            console.error('Error posting comment:', err);
        } finally {
            setPosting(false);
        }
    };

    const handleLike = async () => {
        try {
            const res = await api.post(`/api/match/like-project/`, {
                project: project.id,
                liked: true,
            });
            setLiked(true);
            if (res.data.matched && res.data.match_with) {
                toast.success(`🎉 Hiciste match con ${res.data.match_with} on "${project.name}"!`);
            } else {
                toast.info(`Te gusta "${project.name}"`);
            }
        } catch (err) {
            console.error("Error liking project:", err);
            toast.error("Algo salió mal al darle me gusta al proyecto.");
        }
    };

    if (loading) {
        return (
            <div className="text-center my-5">
                <Spinner animation="border" />
            </div>
        );
    }

    const isCreatorOrMentor =
        currentUser &&
        (currentUser.id === project.creator || currentUser.id === project.mentor?.id);

    console.log(" isCreatorOrMentor ",  isCreatorOrMentor )

    return (
        <Container fluid className="py-5 px-4">
            <Row className="justify-content-center">
                <Col lg={10} xl={9}>
                    {/* Header like a blog */}
                    <header className="pb-3 mb-4 border-bottom">
                        <h1 className="display-4">{project.name}</h1>
                        <p className="lead">{project.description}</p>
                    </header>

                    <Row>
                        {/* Left: Comments + Form */}
                        <Col md={8}>
                            <CommentList comments={comments} />
                            {isLoggedIn && (
                                <div className="position-sticky bottom-0 bg-white p-3 border-top">
                                    <Form onSubmit={handlePostComment}>
                                        <Form.Group className="mb-2">
                                            <Form.Label>Agrega un comentario</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                placeholder="Escribt tu comentario aquí..."
                                            />
                                        </Form.Group>
                                        <Button type="submit" disabled={posting}>
                                            {posting ? 'Publicando...' : 'Publicar Comentario'}
                                        </Button>
                                    </Form>
                                </div>
                            )}
                        </Col>

                        {/* Right: Project Details */}
                        <Col md={4}>
                            <div className="position-sticky top-0" style={{ zIndex: 1 }}>
                                <Card className="shadow-sm">
                                    <Card.Header>Detalles del Proyecto</Card.Header>
                                    <ListGroup variant="flush">
                                        <ListGroup.Item>
                                            <strong>Asesor:</strong>{' '}
                                            {project.mentor ? project.mentor.username : 'Ninguno'}
                                        </ListGroup.Item>
                                        <ListGroup.Item>
                                        <strong>Estudiantes:</strong>
                                        {project.students?.length > 0 ? (
                                            <ul className="list-unstyled mt-2">
                                            {project.students.map(student => {
                                                const isCreator = student.id === project.creator;
                                                const isMentor = project.mentor && student.id === project.mentor.id;

                                                return (
                                                <li
                                                    key={student.id}
                                                    className="d-flex justify-content-between align-items-center mb-2"
                                                >
                                                    <span>{student.username}</span>
                                                    {isCreator || isMentor ? (
                                                    <span className="badge bg-info">{isCreator ? "Creador" : "Asesor"}</span>
                                                    ) : isCreatorOrMentor ? (
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={async () => {
                                                        try {
                                                            await api.post(`/api/projects/${project.id}/unassign-user/`, {
                                                            user_id: student.id,
                                                            });
                                                            setProject(prev => ({
                                                            ...prev,
                                                            students: prev.students.filter(u => u.id !== student.id),
                                                            status:
                                                                prev.students.length - 1 < 3 && prev.status === "team_complete"
                                                                ? "looking_students"
                                                                : prev.status,
                                                            }));
                                                        } catch (err) {
                                                            console.error("Error removing student:", err);
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
                                            {project.categories_details?.map(cat => cat.name).join(', ') || 'Ninguna'}
                                        </ListGroup.Item>
                                        <ListGroup.Item>
                                            <strong>Habilidades Requeridas:</strong>{' '}
                                            {project.required_abilities_details?.map(ab => ab.name).join(', ') || 'Ninguna'}
                                        </ListGroup.Item>

                                        {isCreatorOrMentor && (
                                            <>
                                                <ListGroupItem>
                                                    <Link to={`/projects/${project.id}/edit`} className="btn btn-primary mt-3 w-100">
                                                        Editar Proyecto
                                                    </Link>
                                                </ListGroupItem>
                                                <ListGroupItem>
                                                    <Link to={`/projects/${project.id}/matched-users`} className="btn btn-outline-success mt-2 w-100">
                                                        Ver Estudintes con Match
                                                    </Link>
                                                </ListGroupItem>
                                                <ListGroupItem>
                                                    <Link to={`/projects/${project.id}/matched-mentors`} className="btn btn-outline-info mt-2 w-100">
                                                        Ver Asesores con Matc
                                                    </Link>
                                                </ListGroupItem>
                                            </>
                                        )}
                                    </ListGroup>
                                    {isLoggedIn && (() => {
                                        const isStudent = currentUser?.user_type === "student";
                                        const isMentor = currentUser?.user_type === "mentor";
                                        const isOwner = currentUser?.id === project.creator;
                                        const isStudentInAnyProject = isStudent && currentUser?.projects?.length > 0;

                                        if (isOwner) return null;

                                        if (isStudentInAnyProject) return null;

                                        if (liked) {
                                            return (
                                            <ListGroupItem>
                                                <Button variant="success" className="mt-3 w-100" disabled>
                                                ❤️ Te Gusta
                                                </Button>
                                            </ListGroupItem>
                                            );
                                        }

                                        if (isMentor || isStudent) {
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
