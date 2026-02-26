import { useEffect, useState } from 'react';
import { Container, Carousel, Button, Spinner, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import api from '../api';

dayjs.extend(relativeTime);

function CarruselProyectos({ titulo, proyectos }) {
  const navigate = useNavigate();

  console.error("proyectos registrados: " + proyectos.length)

  if (!proyectos.length) return null;

  return (
    <section className="mb-5">
      <h2 className="mb-4">{titulo}</h2>
      <Carousel indicators={true} controls={true} interval={3000}>
        {proyectos.map((proyecto) => (
          <Carousel.Item key={proyecto.id}>
            <div className="p-5 bg-light rounded-4 shadow-sm border text-center">
              <h3 className="fw-bold">{proyecto.name}</h3>
              <p className="text-muted">{proyecto.description.slice(0, 200)}...</p>
              <div className="mb-3">
                {dayjs().diff(dayjs(proyecto.created_at), 'day') <= 7 && (
                  <Badge bg="success" className="me-2">Nuevo</Badge>
                )}
                {proyecto.students?.length == 2 && (
                  <Badge bg="warning" text="dark">Popular</Badge>
                )}
              </div>
              <Button variant="primary" onClick={() => navigate(`/projects/${proyecto.id}`)}>
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
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const navigate = useNavigate();

  // useEffect ejecuta cambios después que el componente se despliega
  useEffect(() => {
    const obtenerProyectos = async () => {
      try {
        const res = await api.get('/api/projects/');
        setProyectos(res.data);
      } catch (err) {
        console.error('Error obteniendo proyectos:', err);
      } finally {
        setCargando(false);
      }
    };

    obtenerProyectos();
  }, []); // [] es una lista vacía de dependencias. La función se ejecuta solo una vez después del despliegue

  if (cargando) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
      </div>
    );
  }

  const listaProyectos = Array.isArray(proyectos) ? proyectos : proyectos?.results || [];
  // proyectos creados en los últimos 7 días
  const proyectosNuevos = listaProyectos
    .filter(p => {
      const diff = dayjs().diff(dayjs(p.created_at), 'day');
      return diff >= 0 && diff <= 7;
    })
    .slice(0, 3);

  // proyectos con 2 estudiantes
  const proyectosPopulares = listaProyectos
    .filter(p => p.students?.length == 2)
    .slice(0, 3);

  // proyectos con equipo completo o proyectos completados
  const historiasExito = listaProyectos
    .filter(p => ['team_complete', 'completed'].includes(p.status))
    .slice(0, 3);

  return (
    <Container className="py-5">
      <h1 className="text-center fw-bold mb-5">Descubre Proyectos</h1>

      <CarruselProyectos titulo="Proyectos Nuevos" proyectos={proyectosNuevos} />
      <CarruselProyectos titulo="Proyectos Populares" proyectos={proyectosPopulares} />
      <CarruselProyectos titulo="Historias de Éxito" proyectos={historiasExito} />

      <div className="text-center mt-5">
        <Button variant="outline-primary" size="lg" onClick={() => navigate('/projects')}>
          Ver Todos
        </Button>
      </div>
    </Container>
  );
}

export default HomeShowcase;
