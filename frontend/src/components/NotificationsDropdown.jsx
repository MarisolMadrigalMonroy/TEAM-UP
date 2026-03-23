// src/components/NotificationsDropdown.jsx
import { useEffect, useState } from 'react';
import { Dropdown, Badge, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

/*
* Componente para notificaciones
*/
function NotificationsDropdown() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const obtenerNotificaciones = async () => {
      try {
        const res = await api.get('/api/notificaciones/?limit=5');

        // Si la respuesta de la API tiene notificaciones las guardamos, sino usamos una lista vacía
        setNotificaciones(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Error obteniendo notificaciones:', err);
        setNotificaciones([]);
      } finally {
        setCargando(false);
      }
    };

    obtenerNotificaciones();
  }, []);

  const sinLeer = notificaciones.filter(n => !n.leido).length;

  const handleNotificationClick = async (notificacion) => {
    /* Función para controlar clicks en notificaciones */
    if (!notificacion.leido) {
      /* Si la notificación no ha sido leída, la intentamos marcar como leída */
      try {
        await api.post(`/api/notificaciones/${notificacion.id}/marcar-leido/`);
        setNotificaciones(prev =>
          prev.map(n =>
            n.id === notificacion.id ? { ...n, leido: true } : n
          )
        );
      } catch (err) {
        console.error('Error marcando notificación como leída:', err);
      }
    }

    if (notificacion.proyecto_relacionado) {
      /* Si la notificación tiene un proyecto asociado, navegamos hacia el proyecto */
      navigate(`/proyectos/${notificacion.proyecto_relacionado}`);
    }
  };

  return (
    <Dropdown align="end">
      <Dropdown.Toggle variant="light" id="dropdown-notifications">
        🔔 {/* Indicamos la cantidad de notificaciones sin leer */}
        {sinLeer > 0 && (
          <Badge bg="danger" className="ms-1">
            {sinLeer}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu style={{ minWidth: '300px' }}>
        <Dropdown.Header>Notificaciones</Dropdown.Header>

        {cargando ? (
          <div className="text-center p-2">
            <Spinner animation="border" size="sm" /> Cargando...
          </div>
        ) : (
          <>
            {/* Si no hay notificaciones lo indicamos textualmente, en otro caso desplegamos las notificaciones */}
            {sinLeer === 0 ? (
              <Dropdown.ItemText>Sin notificaciones nuevas</Dropdown.ItemText>
            ) : (
              notificaciones
                .filter(n => !n.leido)
                .map((n) => (
                  <Dropdown.Item
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="fw-bold"
                  >
                    {n.mensaje.slice(0, 60)}
                  </Dropdown.Item>
                ))
            )}
            <Dropdown.Divider />
            <Dropdown.Item as={Link} to="/notificaciones" className="text-center text-primary">
              Ver todas las notificaciones →
            </Dropdown.Item>
          </>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default NotificationsDropdown;
