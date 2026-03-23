import { useEffect, useState } from 'react';
import { Card, Spinner, Container, Badge, Button } from 'react-bootstrap';
import api from '../api';
import { useNavigate } from 'react-router-dom';

/*
* Componente que representa la página para mostrar notificaciones 
*/
function PaginaNotificaciones() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const obtenerNotificaciones = async () => {
      try {
        const res = await api.get('/api/notificaciones/');
        setNotificaciones(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Error cargando las notificaciones:', err);
      } finally {
        setCargando(false);
      }
    };

    obtenerNotificaciones();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.post(`/api/notificaciones/${id}/marcar-leido/`);
      setNotificaciones(prev =>
        prev.map(n => (n.id === id ? { ...n, leido: true } : n))
      );
    } catch (err) {
      console.error('Error al marcar como leída:', err);
    }
  };

  const handleNavigate = (notificacion) => {
    if (notificacion.proyecto_relacionado) {
      navigate(`/proyectos/${notificacion.proyecto_relacionado}`);
    }
  };

  if (cargando) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <h2 className="mb-4">Mis Notificaciones</h2>

      {notificaciones.length === 0 ? (
        <p>No tienes notificaciones.</p>
      ) : (
        notificaciones.map((n) => (
          <Card
            key={n.id}
            className={`mb-3 ${!n.leido ? 'border-primary' : ''}`}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div onClick={() => handleNavigate(n)} style={{ cursor: 'pointer' }}>
                  <Card.Text className={n.leido ? '' : 'fw-bold'}>
                    {n.mensaje}
                  </Card.Text>
                  <small className="text-muted">{new Date(n.creado_en).toLocaleString()}</small>
                </div>

                {!n.leido && (
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => handleMarkAsRead(n.id)}
                  >
                    Marcar como leída
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
        ))
      )}
    </Container>
  );
}

export default PaginaNotificaciones;
