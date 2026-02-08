// src/components/NotificationsDropdown.jsx
import { useEffect, useState } from 'react';
import { Dropdown, Badge, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

function NotificationsDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/api/notifications/?limit=5');
        console.log('Notification API response:', res.data);
        setNotifications(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await api.post(`/api/notifications/${notification.id}/mark-read/`);
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id ? { ...n, is_read: true } : n
          )
        );
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }

    if (notification.related_project) {
      navigate(`/projects/${notification.related_project}`);
    }
  };

  return (
    <Dropdown align="end">
      <Dropdown.Toggle variant="light" id="dropdown-notifications">
        🔔
        {unreadCount > 0 && (
          <Badge bg="danger" className="ms-1">
            {unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu style={{ minWidth: '300px' }}>
        <Dropdown.Header>Notificaciones</Dropdown.Header>

        {loading ? (
          <div className="text-center p-2">
            <Spinner animation="border" size="sm" /> Cargando...
          </div>
        ) : (
          <>
            {unreadCount === 0 ? (
              <Dropdown.ItemText>Sin notificaciones nuevas</Dropdown.ItemText>
            ) : (
              notifications
                .filter(n => !n.is_read)
                .map((n) => (
                  <Dropdown.Item
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="fw-bold"
                  >
                    {n.message.slice(0, 60)}
                  </Dropdown.Item>
                ))
            )}
            <Dropdown.Divider />
            <Dropdown.Item as={Link} to="/notifications" className="text-center text-primary">
              Ver todas las notificaciones →
            </Dropdown.Item>
          </>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default NotificationsDropdown;
