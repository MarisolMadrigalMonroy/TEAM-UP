import { useEffect, useState, useMemo } from 'react';
import { Card, Button, Spinner, Container, Row, Col, Form, Alert } from 'react-bootstrap';
import api from '../api';
import { obtenerUsuarioActual } from '../auth';
import { toast } from 'react-toastify';

function SuggestedUsers({ userType = 'student' }) {
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProjects, setActiveProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const currentUser = obtenerUsuarioActual();

  useEffect(() => {
    const fetchUserProjects = async () => {
      try {
        const res = await api.get('/api/projects/');
        const owned = res.data.filter(p => {
          const mentorId = typeof p.mentor === 'object' ? p.mentor?.id : p.mentor;
          return p.creator === currentUser?.user_id || mentorId === currentUser?.user_id;
        });

        setActiveProjects(owned);

        if (owned.length > 0) {
          setSelectedProject(owned[0].id);
        }
      } catch (err) {
        console.error('Error fetching user projects:', err);
      }
    };

    fetchUserProjects();
  }, [currentUser?.user_id]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!selectedProject) return;

      setLoading(true);
      try {
        const res = await api.get('/api/match/ai-suggested-users/', {
          params: { project_id: selectedProject, user_type: userType }
        });
        setSuggestedUsers(res.data);
      } catch (err) {
        console.error('Error fetching suggested users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [selectedProject, userType]);

  const handleLike = async (userId) => {
    if (!selectedProject) {
      alert('Por favor selecciona un proyecto.');
      return;
    }
    try {
      const res = await api.post('/api/match/like-user/', {
        user: userId,
        project: selectedProject,
        liked: true
      });
      if (res.data.matched && res.data.match_with) {
        toast.success(`🎉 Hiciste match con ${res.data.match_with}!`);
      }
      setSuggestedUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Error liking user:', err);
    }
  };

  const handleDislike = async (userId) => {
    if (!selectedProject) {
      alert('Por favor selecciona un proyecto.');
      return;
    }
    try {
      await api.post('/api/match/dislike-user/', {
        user: userId,
        project: selectedProject,
        liked: false
      });
      setSuggestedUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Error disliking user:', err);
    }
  };

  const selectedProjectObj = useMemo(() => {
    return activeProjects.find(p => p.id === selectedProject);
  }, [selectedProject, activeProjects]);

  const canLikeOrDislike = useMemo(() => {
    if (!selectedProjectObj || !currentUser) return false;

    const creatorId = selectedProjectObj.creator;
    const mentorId =
      typeof selectedProjectObj.mentor === 'object'
        ? selectedProjectObj.mentor?.id
        : selectedProjectObj.mentor;

    return creatorId === currentUser.user_id || mentorId === currentUser.user_id;
  }, [selectedProjectObj, currentUser]);

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">
        Sugerencias de {userType === 'mentor' ? 'Asesores' : 'Estudiantes'}
      </h2>

      {activeProjects.length > 0 && (
        <Form.Group className="mb-3" controlId="projectSelect">
          <Form.Label>Selecciona un Proyecto</Form.Label>
          <Form.Select
            value={selectedProject || ''}
            onChange={(e) => setSelectedProject(parseInt(e.target.value))}
          >
            <option value=''>-- Selecciona un Proyecto --</option>
            {activeProjects.map(proj => (
              <option key={proj.id} value={proj.id}>{proj.name}</option>
            ))}
          </Form.Select>
        </Form.Group>
      )}

      {!selectedProject && (
        <Alert variant="warning">
          Por favor selecciona un proyecto para ver sugerencias de {userType === 'mentor' ? 'asesores' : 'estudiantes'}.
        </Alert>
      )}

      {selectedProject && suggestedUsers.length === 0 && (
        <Alert variant="info">
          No hay sugerencias de {userType === 'mentor' ? 'asesores' : 'estudiantes'}.
        </Alert>
      )}

      <Row xs={1} md={2} lg={3} className="g-4">
        {suggestedUsers.map(user => (
          <Col key={user.id}>
            <Card className="h-100">
              <Card.Body>
                <Card.Title>{user.username}</Card.Title>
                <Card.Text>Bio: {user.bio}</Card.Text>

                {canLikeOrDislike && (
                  <div className="d-flex justify-content-between">
                    <Button variant="success" onClick={() => handleLike(user.id)}>👍 Me gusta</Button>
                    <Button variant="danger" onClick={() => handleDislike(user.id)}>👎 No Me Gusta</Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}

export default SuggestedUsers;
