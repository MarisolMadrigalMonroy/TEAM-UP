import { useEffect, useState } from 'react';
import { Container, Row, Col, Button, Spinner, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import api from '../api';
import '../styles/Badges.css'

dayjs.extend(relativeTime);

function ProjectsList() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await api.get('/api/projects/');
                setProjects(res.data);
            } catch (err) {
                console.error('Error fetching projects:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    const handleViewProject = (id) => {
        navigate(`/projects/${id}`);
    };

    if (loading) {
        return (
            <div className="text-center my-5">
                <Spinner animation="border" />
            </div>
        );
    }

    return (
        <Container fluid className="py-5 px-4">
            <Row className="justify-content-center">
                <Col lg={10} xl={9}>
                <h1 className="display-4 fw-bold text-center mb-5">Explore Exciting Projects</h1>
            <Row xs={1} md={2} className="g-4">
                {projects.map((project) => (
                    <Col key={project.id}>
                        <div className="p-4 bg-light rounded-4 shadow-sm border h-100 d-flex flex-column justify-content-between">
                            <div>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h2 className="fw-bold mb-0">{project.name}</h2>
                                    <div>
                                        {dayjs().diff(dayjs(project.created_at), 'day') <= 7 && (
                                            <Badge bg="success" className="ms-2 badge-pulse">New</Badge>
                                        )}
                                        {project.students?.length >= 3 && (
                                            <Badge bg="warning" text="dark" className="ms-2 badge-fade">Popular</Badge>
                                        )}
                                    </div>
                                </div>
                                <p className="lead text-muted">{project.description}</p>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mt-3">
                                <Button variant="primary" onClick={() => handleViewProject(project.id)}>
                                    View Project
                                </Button>
                                <small className="text-muted">
                                    Created {dayjs(project.created_at).fromNow()} - {project.created_at}
                                </small>
                            </div>
                        </div>
                    </Col>
                ))}
            </Row>
            </Col>
            </Row>
            
            
        </Container>
    );
}

export default ProjectsList;
