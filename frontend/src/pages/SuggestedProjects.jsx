// src/components/SuggestedProjects.jsx
import { useEffect, useState } from 'react';
import api from '../api';
import { Button, Card, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';

function SuggestedProjects({ user }) {
  const [suggested, setSuggested] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await api.get('/api/match/ai-suggested-projects/');
        setSuggested(res.data);
      } catch (err) {
        console.error('Error fetching suggested projects:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, []);

  const handleAction = async (action) => {
    const project = suggested[currentIndex];
    const liked = action === 'like'; 

    try {
        const res = await api.post(`/api/match/${action}-project/`, {
            project: project.id,
            liked: liked,
            });
        if (res.data.matched && res.data.match_with) {
          toast.success(`🎉 Hiciste match con ${res.data.match_with} en "${project.name}"!`);
        }
        setCurrentIndex((prev) => prev + 1);
    } catch (err) {
        console.error(`Error when trying to ${action} project:`, err);
    }
  };

  if (loading) return <div className="text-center"><Spinner animation="border" /></div>;
  if (currentIndex >= suggested.length) return <p>No hay más sugerencias por el momento.</p>;

  const project = suggested[currentIndex];

  return (
    <Card className="p-4 shadow-sm">
      <Card.Body>
        <Card.Title>{project.name}</Card.Title>
        <Card.Text>{project.description}</Card.Text>

        <div className="d-flex gap-2">
          <Button variant="danger" onClick={() => handleAction('dislike')}>
            Dislike
          </Button>
          <Button variant="success" onClick={() => handleAction('like')}>
            Like
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

export default SuggestedProjects;
