// src/pages/PerfilPublico.jsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Container,
  Card,
  Badge,
  Button,
  Form,
  Spinner
} from 'react-bootstrap';
import api from '../api';
import { toast } from 'react-toastify';

/*
* Página pública para visualizar el perfil de un usuario
* Permite evaluar habilidades, intereses y proyectos,
* además de mostrar interés desde uno de mis proyectos.
*/
function PerfilPublico({ usuario, refrescarNotificaciones }) {
  const { id } = useParams();

  const [perfil, setPerfil] = useState(null);
  const [misProyectos, setMisProyectos] = useState([]);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviandoInteres, setEnviandoInteres] = useState(false);
  const [yaMostroInteres, setYaMostroInteres] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [perfilRes, proyectosRes] = await Promise.all([
          api.get(`/api/usuarios/${id}/`),
          api.get('/api/proyectos/')
        ]);

        setPerfil(perfilRes.data);

        // Obtener solo proyectos donde soy creador o asesor
        const propios = proyectosRes.data.filter((p) => {
          const asesorId =
            typeof p.asesor === 'object'
              ? p.asesor?.id
              : p.asesor;
          const creadorId =
            typeof p.creador === 'object'
              ? p.creador?.id
              : p.creador;

          return (
            p.creador === usuario?.id ||
            asesorId === usuario?.id ||
            creadorId === usuario?.id
          );
        });

        setMisProyectos(propios);

        if (propios.length > 0) {
          setProyectoSeleccionado(propios[0].id);

        }
      } catch (err) {
        console.error('Error cargando perfil público:', err);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [id, usuario]);

  useEffect(() => {
    const verificarInteres = async () => {
      if (!proyectoSeleccionado || !id) return;

      try {
        const res = await api.get(
          `/api/match/interes-usuario/?usuario=${id}&proyecto=${proyectoSeleccionado}`
        );

        setYaMostroInteres(res.data.gustado);
      } catch (err) {
        console.error('Error verificando interés:', err);
        setYaMostroInteres(false);
      }
    };

    verificarInteres();
  }, [proyectoSeleccionado, id]);

  const traducirEstado = (estado) => {
    if (estado === 'disponible') return 'Buscando Proyecto';
    if (estado === 'registrado') return 'En un Proyecto';
    return 'No Disponible';
  };

  const traducirRol = (rol) => {
    if (rol === 'asesor') return 'Asesor';
    if (rol === 'estudiante') return 'Estudiante';
    return rol;
  };

  const handleLikeUsuario = async () => {
    if (!proyectoSeleccionado || yaMostroInteres) return;

    try {
      setEnviandoInteres(true);

      const res = await api.post('/api/match/like-usuario/', {
        usuario: perfil.id,
        proyecto: proyectoSeleccionado,
        gustado: true
      });

      if (res.data.emparejado && res.data.emparejado_con) {
        await refrescarNotificaciones();
        toast.success(`🎉 Hiciste match con ${res.data.emparejado_con} en "${proyectoSeleccionado.nombre}"!`);
      }

      setYaMostroInteres(true);

    } catch (err) {
      console.error('Error mostrando interés:', err);
      alert('No fue posible mostrar interés.');
    } finally {
      setEnviandoInteres(false);
    }
  };

  if (cargando) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!perfil) {
    return (
      <Container className="py-5">
        <p>No se encontró el usuario.</p>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Card className="shadow-sm p-4">
        <h2 className="mb-3">{perfil.username}</h2>

        <p>
          <strong>Rol:</strong>{' '}
          <Badge bg="secondary">
            {traducirRol(perfil.tipo_usuario)}
          </Badge>
        </p>

        <p>
          <strong>Estado:</strong>{' '}
          <Badge bg="primary">
            {traducirEstado(perfil.estado)}
          </Badge>
        </p>

        <p>
          <strong>Biografía:</strong>{' '}
          {perfil.bio || '(Sin biografía)'}
        </p>

        <div className="mb-3">
          <strong>Intereses:</strong>
          <div className="mt-2">
            {perfil.intereses?.length > 0 ? (
              perfil.intereses.map((interes) => (
                <Badge
                  key={interes.id}
                  bg="success"
                  className="me-1 mb-1"
                >
                  {interes.nombre}
                </Badge>
              ))
            ) : (
              <span> (Ninguno)</span>
            )}
          </div>
        </div>

        <div className="mb-3">
          <strong>Habilidades:</strong>
          <div className="mt-2">
            {perfil.habilidades?.length > 0 ? (
              perfil.habilidades.map((habilidad) => (
                <Badge
                  key={habilidad.id}
                  bg="info"
                  className="me-1 mb-1"
                >
                  {habilidad.nombre}
                </Badge>
              ))
            ) : (
              <span> (Ninguna)</span>
            )}
          </div>
        </div>

        <hr />

        <h5>Proyectos</h5>
        {perfil.proyectos?.length > 0 ? (
          perfil.proyectos.map((proyecto) => (
            <div key={proyecto.id} className="mb-2">
              <Link to={`/proyectos/${proyecto.id}`}>
                {proyecto.nombre}
              </Link>
            </div>
          ))
        ) : (
          <p>No participa en proyectos actualmente.</p>
        )}

        {/* Mostrar interés solo si tengo proyectos */}
        {misProyectos.length > 0 && (
          <>
            <hr />
            <h5>Mostrar interés desde mi proyecto</h5>

            <Form.Select
              className="mb-3"
              value={proyectoSeleccionado}
              onChange={(e) =>
                setProyectoSeleccionado(e.target.value)
              }
            >
              {misProyectos.map((proyecto) => (
                <option
                  key={proyecto.id}
                  value={proyecto.id}
                >
                  {proyecto.nombre}
                </option>
              ))}
            </Form.Select>

            <Button
              onClick={handleLikeUsuario}
              disabled={enviandoInteres || yaMostroInteres}
              variant={yaMostroInteres ? "outline-success" : "success" }
            >
              {yaMostroInteres
                ? '❤️ Te Gusta'
                : enviandoInteres
                ? 'Enviando...'
                : 'Me Gusta ❤️'}
            </Button>
          </>
        )}
      </Card>
    </Container>
  );
}

export default PerfilPublico;