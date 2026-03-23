import { useEffect, useState, useMemo } from 'react';
import { Card, Button, Spinner, Container, Row, Col, Form, Alert } from 'react-bootstrap';
import api from '../api';
import { obtenerUsuarioActual } from '../auth';
import { toast } from 'react-toastify';

/*
* Componente que representa sugerencias de usuarios
*/
function UsuariosSugeridos({ tipoUsuario = 'estudiante' }) {
  const [usuariosSugeridos, setUsuariosSugeridos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [proyectosActivos, setProyectosActivos] = useState([]);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const usuarioActual = obtenerUsuarioActual();

  useEffect(() => {
    // Función para obtener los proyectos del usuario
    const obtenerProyectosDeUsuario = async () => {
      try {
        const res = await api.get('/api/proyectos/');
        const poseidos = res.data.filter(p => {
          const asesorId = typeof p.asesor === 'object' ? p.asesor?.id : p.asesor;
          return p.creador === usuarioActual?.usuario_id || asesorId === usuarioActual?.usuario_id;
        });

        setProyectosActivos(poseidos);

        if (poseidos.length > 0) {
          setProyectoSeleccionado(poseidos[0].id);
        }
      } catch (err) {
        console.error('Error obteniendo los proyectos:', err);
      }
    };

    obtenerProyectosDeUsuario();
  }, [usuarioActual?.usuario_id]);

  useEffect(() => {
    const obtenerSugerencias = async () => {
      if (!proyectoSeleccionado) return;

      setCargando(true);
      try {
        const res = await api.get('/api/match/ai-usuarios-sugeridos/', {
          params: { proyecto_id: proyectoSeleccionado, tipo_usuario: tipoUsuario }
        });
        setUsuariosSugeridos(res.data);
      } catch (err) {
        console.error('Error obteniendo usuarios sugeridos:', err);
      } finally {
        setCargando(false);
      }
    };

    obtenerSugerencias();
  }, [proyectoSeleccionado, tipoUsuario]);

  const handleLike = async (usuarioId) => {
    if (!proyectoSeleccionado) {
      alert('Por favor selecciona un proyecto.');
      return;
    }
    try {
      const res = await api.post('/api/match/like-usuario/', {
        usuario: usuarioId,
        proyecto: proyectoSeleccionado,
        gustado: true
      });
      if (res.data.emparejado && res.data.emparejado_con) {
        toast.success(`🎉 Hiciste match con ${res.data.emparejado_con}!`);
      }
      setUsuariosSugeridos(prev => prev.filter(u => u.id !== usuarioId));
    } catch (err) {
      console.error('Error dando me gusta al usuario:', err);
    }
  };

  const handleDislike = async (usuarioId) => {
    if (!proyectoSeleccionado) {
      alert('Por favor selecciona un proyecto.');
      return;
    }
    try {
      await api.post('/api/match/dislike-usuario/', {
        usuario: usuarioId,
        proyecto: proyectoSeleccionado,
        gustado: false
      });
      setUsuariosSugeridos(prev => prev.filter(u => u.id !== usuarioId));
    } catch (err) {
      console.error('Error dando no me gusta al usuario:', err);
    }
  };

  const proyectoSeleccionadoObj = useMemo(() => {
    return proyectosActivos.find(p => p.id === proyectoSeleccionado);
  }, [proyectoSeleccionado, proyectosActivos]);

  const canLikeOrDislike = useMemo(() => {
    if (!proyectoSeleccionadoObj || !usuarioActual) return false;

    const creadorId = proyectoSeleccionadoObj.creador;
    const asesorId =
      typeof proyectoSeleccionadoObj.asesor === 'object'
        ? proyectoSeleccionadoObj.asesor?.id
        : proyectoSeleccionadoObj.asesor;

    return creadorId === usuarioActual.usuario_id || asesorId === usuarioActual.usuario_id;
  }, [proyectoSeleccionadoObj, usuarioActual]);

  if (cargando) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">
        Sugerencias de {tipoUsuario === 'asesor' ? 'Asesores' : 'Estudiantes'}
      </h2>

      {proyectosActivos.length > 0 && (
        <Form.Group className="mb-3" controlId="projectSelect">
          <Form.Label>Selecciona un Proyecto</Form.Label>
          <Form.Select
            value={proyectoSeleccionado || ''}
            onChange={(e) => setProyectoSeleccionado(parseInt(e.target.value))}
          >
            <option value=''>-- Selecciona un Proyecto --</option>
            {proyectosActivos.map(proj => (
              <option key={proj.id} value={proj.id}>{proj.nombre}</option>
            ))}
          </Form.Select>
        </Form.Group>
      )}

      {!proyectoSeleccionado && (
        <Alert variant="warning">
          Por favor selecciona un proyecto para ver sugerencias de {tipoUsuario === 'asesor' ? 'asesores' : 'estudiantes'}.
        </Alert>
      )}

      {proyectoSeleccionado && usuariosSugeridos.length === 0 && (
        <Alert variant="info">
          No hay sugerencias de {tipoUsuario === 'asesor' ? 'asesores' : 'estudiantes'}.
        </Alert>
      )}

      <Row xs={1} md={2} lg={3} className="g-4">
        {usuariosSugeridos.map(usuario => (
          <Col key={usuario.id}>
            <Card className="h-100">
              <Card.Body>
                <Card.Title>{usuario.username}</Card.Title>
                <Card.Text>Bio: {usuario.bio}</Card.Text>

                {canLikeOrDislike && (
                  <div className="d-flex justify-content-between">
                    <Button variant="success" onClick={() => handleLike(usuario.id)}>👍 Me gusta</Button>
                    <Button variant="danger" onClick={() => handleDislike(usuario.id)}>👎 No Me Gusta</Button>
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

export default UsuariosSugeridos;
