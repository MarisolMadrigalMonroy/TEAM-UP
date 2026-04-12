import { useEffect, useState, useMemo } from 'react';
import {
  Card,
  Button,
  Spinner,
  Container,
  Form,
  Alert,
  Row,
  Col
} from 'react-bootstrap';
import api from '../api';
import { obtenerUsuarioActual } from '../auth';
import { toast } from 'react-toastify';
import { FaHeart, FaHeartBroken } from 'react-icons/fa';

/*
* Componente que representa sugerencias de usuarios
*/
function UsuariosSugeridos({ tipoUsuario = 'estudiante' }) {
  const [usuariosSugeridos, setUsuariosSugeridos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [proyectosActivos, setProyectosActivos] = useState([]);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [indiceActual, setIndiceActual] = useState(0);

  const usuarioActual = obtenerUsuarioActual();

  const esDeck = tipoUsuario === 'estudiante';

  useEffect(() => {
    const obtenerProyectosDeUsuario = async () => {
      try {
        const res = await api.get('/api/proyectos/');

        const estadosNoReclutables = [
          'equipo_completo',
          'terminado',
          'cancelado'
        ];

        const poseidos = res.data.filter((p) => {
          const asesorId =
            typeof p.asesor === 'object' ? p.asesor?.id : p.asesor;

          const esMio =
            p.creador?.id === usuarioActual?.user_id ||
            asesorId === usuarioActual?.user_id;

          return esMio && !estadosNoReclutables.includes(p.estado);
        });

        setProyectosActivos(poseidos);

        if (poseidos.length > 0) {
          setProyectoSeleccionado(poseidos[0].id);
        }
      } catch (err) {
        console.error('Error obteniendo proyectos:', err);
      }
    };

    obtenerProyectosDeUsuario();
  }, [usuarioActual?.user_id]);

  useEffect(() => {
    const obtenerSugerencias = async () => {
      if (!proyectoSeleccionado) return;

      setUsuariosSugeridos([]);
      setIndiceActual(0);
      setCargando(true);

      try {
        const res = await api.get('/api/match/ai-usuarios-sugeridos/', {
          params: {
            proyecto_id: proyectoSeleccionado,
            tipo_usuario: tipoUsuario
          }
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

  const proyectoSeleccionadoObj = useMemo(() => {
    return proyectosActivos.find((p) => p.id === proyectoSeleccionado);
  }, [proyectoSeleccionado, proyectosActivos]);

  const canLikeOrDislike = useMemo(() => {
    if (!proyectoSeleccionadoObj || !usuarioActual) return false;

    const currentUserId = Number(usuarioActual.user_id);

    const creadorId =
      typeof proyectoSeleccionadoObj.creador === 'object'
        ? proyectoSeleccionadoObj.creador?.id
        : proyectoSeleccionadoObj.creador;

    const asesorId =
      typeof proyectoSeleccionadoObj.asesor === 'object'
        ? proyectoSeleccionadoObj.asesor?.id
        : proyectoSeleccionadoObj.asesor;

    return creadorId === currentUserId || asesorId === currentUserId;
  }, [proyectoSeleccionadoObj, usuarioActual]);

  const handleDeckAction = async (accion) => {
    const usuario = usuariosSugeridos[indiceActual];
    if (!usuario || !proyectoSeleccionado) return;

    try {
      const endpoint =
        accion === 'like'
          ? '/api/match/like-usuario/'
          : '/api/match/dislike-usuario/';

      const res = await api.post(endpoint, {
        usuario: usuario.id,
        proyecto: proyectoSeleccionado,
        gustado: accion === 'like'
      });

      if (accion === 'like' && res.data.emparejado && res.data.emparejado_con) {
        toast.success(`🎉 Hiciste match con ${res.data.emparejado_con}!`);
      }

      setIndiceActual((prev) => prev + 1);
    } catch (err) {
      console.error(`Error dando ${accion}:`, err);
    }
  };

  const handleGridAction = async (usuarioId, accion) => {
    if (!proyectoSeleccionado) return;

    try {
      const endpoint =
        accion === 'like'
          ? '/api/match/like-usuario/'
          : '/api/match/dislike-usuario/';

      const res = await api.post(endpoint, {
        usuario: usuarioId,
        proyecto: proyectoSeleccionado,
        gustado: accion === 'like'
      });

      if (accion === 'like' && res.data.emparejado && res.data.emparejado_con) {
        toast.success(`🎉 Hiciste match con ${res.data.emparejado_con}!`);
      }

      setUsuariosSugeridos((prev) =>
        prev.filter((u) => u.id !== usuarioId)
      );
    } catch (err) {
      console.error(`Error dando ${accion}:`, err);
    }
  };

  if (cargando) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!proyectoSeleccionado) {
    return (
      <Container className="py-4">
        <Alert variant="warning">
          Por favor selecciona un proyecto para ver sugerencias.
        </Alert>
      </Container>
    );
  }

  if (!proyectoSeleccionadoObj) return null;

  const proyectoLleno =
    tipoUsuario === 'estudiante' &&
    proyectoSeleccionadoObj.estudiantes?.length >= 3;

  return (
    <Container className="py-4">
      <h2 className="mb-4">
        Sugerencias de {tipoUsuario === 'asesor' ? 'Asesores' : 'Estudiantes'}
      </h2>

      {proyectosActivos.length > 0 && (
        <Form.Group className="mb-3">
          <Form.Label>Selecciona un Proyecto</Form.Label>
          <Form.Select
            value={proyectoSeleccionado || ''}
            onChange={(e) =>
              setProyectoSeleccionado(parseInt(e.target.value))
            }
          >
            {proyectosActivos.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.nombre}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      )}

      {proyectoLleno ? (
        <Alert variant="secondary">
          Este proyecto ya tiene el equipo completo.
        </Alert>
      ) : usuariosSugeridos.length === 0 ? (
        <Alert variant="info">
          No hay sugerencias de{' '}
          {tipoUsuario === 'asesor' ? 'asesores' : 'estudiantes'}.
        </Alert>
      ) : esDeck ? (
        indiceActual >= usuariosSugeridos.length ? (
          <Alert variant="info">
            No hay más sugerencias de estudiantes.
          </Alert>
        ) : (
          <Card className="p-4 shadow-sm">
            <Card.Body>
              <Card.Title>
                {usuariosSugeridos[indiceActual].username}
              </Card.Title>

              <Card.Text>
                Bio: {usuariosSugeridos[indiceActual].bio || 'Sin biografía'}
              </Card.Text>

              <Alert variant="info">
                Da me gusta o no me gusta para seguir explorando más sugerencias.
              </Alert>

              {canLikeOrDislike && (
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-danger"
                    onClick={() => handleDeckAction('dislike')}
                  >
                    <FaHeartBroken className="text-danger me-2" />
                    No me gusta
                  </Button>

                  <Button
                    variant="outline-success"
                    onClick={() => handleDeckAction('like')}
                  >
                    <FaHeart className="text-danger me-2" />
                    Me gusta
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        )
      ) : (
        <Row className="g-4">
          {usuariosSugeridos.map((usuario) => (
            <Col key={usuario.id} md={6} lg={4}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <Card.Title>{usuario.username}</Card.Title>

                  <Card.Text>
                    Bio: {usuario.bio || 'Sin biografía'}
                  </Card.Text>

                  {canLikeOrDislike && (
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-danger"
                        onClick={() =>
                          handleGridAction(usuario.id, 'dislike')
                        }
                      >
                        <FaHeartBroken className="text-danger me-2" />
                        No me gusta
                      </Button>

                      <Button
                        variant="outline-success"
                        onClick={() =>
                          handleGridAction(usuario.id, 'like')
                        }
                      >
                        <FaHeart className="text-danger me-2" />
                        Me gusta
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}

export default UsuariosSugeridos;