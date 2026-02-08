import { useEffect, useState } from 'react';
import { Card, Spinner, Container, Badge, Button } from 'react-bootstrap';
import api from '../api';
import { useNavigate } from 'react-router-dom';

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllNotifications = async () => {
      try {
        const res = await api.get('/api/notifications/');
        setNotifications(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Error loading notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.post(`/api/notifications/${id}/mark-read/`);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleNavigate = (notification) => {
    if (notification.related_project) {
      navigate(`/projects/${notification.related_project}`);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <h2 className="mb-4">Mis Notificaciones</h2>

      {notifications.length === 0 ? (
        <p>No tienes notificaciones.</p>
      ) : (
        notifications.map((n) => (
          <Card
            key={n.id}
            className={`mb-3 ${!n.is_read ? 'border-primary' : ''}`}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div onClick={() => handleNavigate(n)} style={{ cursor: 'pointer' }}>
                  <Card.Text className={n.is_read ? '' : 'fw-bold'}>
                    {n.message}
                  </Card.Text>
                  <small className="text-muted">{new Date(n.created_at).toLocaleString()}</small>
                </div>

                {!n.is_read && (
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

export default NotificationsPage;
