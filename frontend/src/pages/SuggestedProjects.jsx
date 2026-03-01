// src/components/SuggestedProjects.jsx
import { useEffect, useState } from 'react';
import api from '../api';
import { Button, Card, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';

/*
* Componente que representa sugerencias de proyectos 
*/
function SuggestedProjects({ user }) {
  const [sugeridos, setSugeridos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [indiceActual, setIndiceActual] = useState(0);

  useEffect(() => {
    // Función para obtener sugerencias de proyectos
    const obtenerSugerencias = async () => {
      try {
        const res = await api.get('/api/match/ai-suggested-projects/');
        setSugeridos(res.data);
      } catch (err) {
        console.error('Error obteniendo proyectos sugeridos:', err);
      } finally {
        setCargando(false);
      }
    };
    obtenerSugerencias();
  }, []);

  // Función para controlar cuando se le da me gusta/no me gusta a un proyecto
  const handleAction = async (accion) => {
    const proyecto = sugeridos[indiceActual];
    const gustado = accion === 'like'; 

    try {
        const res = await api.post(`/api/match/${accion}-project/`, {
            project: proyecto.id,
            liked: gustado,
            });
        if (res.data.matched && res.data.match_with) {
          toast.success(`🎉 Hiciste match con ${res.data.match_with} en "${proyecto.name}"!`);
        }
        setIndiceActual((prev) => prev + 1);
    } catch (err) {
        console.error(`Error tratando de dar ${accion} al proyecto:`, err);
    }
  };

  if (cargando) return <div className="text-center"><Spinner animation="border" /></div>;
  if (indiceActual >= sugeridos.length) return <p>No hay más sugerencias por el momento.</p>;

  const proyecto = sugeridos[indiceActual];

  return (
    <Card className="p-4 shadow-sm">
      <Card.Body>
        <Card.Title>{proyecto.name}</Card.Title>
        <Card.Text>{proyecto.description}</Card.Text>

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
