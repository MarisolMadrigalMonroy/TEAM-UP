// src/components/ProyectosSugeridos.jsx
import { useEffect, useState } from 'react';
import api from '../api';
import { Button, Card, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaHeart, FaHeartBroken } from 'react-icons/fa';

/*
* Componente que representa sugerencias de proyectos 
*/
function ProyectosSugeridos({ usuario }) {
  const [sugeridos, setSugeridos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [indiceActual, setIndiceActual] = useState(0);

  useEffect(() => {
    // Función para obtener sugerencias de proyectos
    const obtenerSugerencias = async () => {
      try {
        const res = await api.get('/api/match/ai-proyectos-sugeridos/');
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
        const res = await api.post(`/api/match/${accion}-proyecto/`, {
            proyecto: proyecto.id,
            gustado: gustado,
            });
        if (res.data.emparejado && res.data.emparejado_con) {
          toast.success(`🎉 Hiciste match con ${res.data.emparejado_con} en "${proyecto.nombre}"!`);
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
        <Card.Title>{proyecto.nombre}</Card.Title>
        <Card.Text
          style={{
          whiteSpace: 'pre-line',
          lineHeight: '1.8'
        }}
        >
          {proyecto.descripcion}
        </Card.Text>

        <div className="d-flex gap-2">
          <Button variant="outline-danger" onClick={() => handleAction('dislike')}>
            <FaHeartBroken className="text-danger me-2" />
              No me gusta
          </Button>
          <Button variant="outline-success" onClick={() => handleAction('like')}>
            <FaHeart className="text-danger me-2" />
              Me gusta
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

export default ProyectosSugeridos;
