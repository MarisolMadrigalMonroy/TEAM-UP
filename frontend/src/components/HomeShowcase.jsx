import { useEffect, useState } from 'react';
import { Container, Carousel, Button, Spinner, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import api from '../api';

dayjs.extend(relativeTime);

function ProjectCarousel({ title, projects }) {
  const navigate = useNavigate();

  console.error("registered projects: " + projects.length)

  if (!projects.length) return null;

  return (
    <section className="mb-5">
      <h2 className="mb-4">{title}</h2>
      <Carousel indicators={true} controls={true} interval={3000}>
        {projects.map((project) => (
          <Carousel.Item key={project.id}>
            <div className="p-5 bg-light rounded-4 shadow-sm border text-center">
              <h3 className="fw-bold">{project.name}</h3>
              <p className="text-muted">{project.description.slice(0, 200)}...</p>
              <div className="mb-3">
                {dayjs().diff(dayjs(project.created_at), 'day') <= 7 && (
                  <Badge bg="success" className="me-2">Nuevo</Badge>
                )}
                {project.students?.length == 2 && (
                  <Badge bg="warning" text="dark">Popular</Badge>
                )}
              </div>
              <Button variant="primary" onClick={() => navigate(`/projects/${project.id}`)}>
                Ver Proyecto
              </Button>
            </div>
          </Carousel.Item>
        ))}
      </Carousel>
    </section>
  );
}

function HomeShowcase() {
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

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
      </div>
    );
  }

  const projectList = Array.isArray(projects) ? projects : projects?.results || [];
  const newProjects = projectList
    .filter(p => {
      const diff = dayjs().diff(dayjs(p.created_at), 'day');
      return diff >= 0 && diff <= 7;
    })
    .slice(0, 3);

  const popularProjects = projectList
    .filter(p => p.students?.length == 2)
    .slice(0, 3);

  const successStories = projectList
    .filter(p => ['team_complete', 'completed'].includes(p.status))
    .slice(0, 3);

  return (
    <Container className="py-5">
      <h1 className="text-center fw-bold mb-5">Descubre Proyectos</h1>

      <ProjectCarousel title="Proyectos Nuevos" projects={newProjects} />
      <ProjectCarousel title="Proyectos Populares" projects={popularProjects} />
      <ProjectCarousel title="Historias de Éxito" projects={successStories} />

      <div className="text-center mt-5">
        <Button variant="outline-primary" size="lg" onClick={() => navigate('/projects')}>
          Ver Todos
        </Button>
      </div>
    </Container>
  );
}

export default HomeShowcase;
