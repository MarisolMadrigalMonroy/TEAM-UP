import { useEffect, useState } from 'react';
import { Container, Row, Col, Form, Card, Button } from 'react-bootstrap';
import api from '../api';
import AvatarBubble from "../components/AvatarBubble";
import {
  FaLightbulb,
  FaGraduationCap,
  FaTools
} from "react-icons/fa";

/*
* Componente que representa la página para mostrar proyectos 
*/
function PaginaProyectos() {
  const [proyectos, setProyectos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [habilidades, setHabilidades] = useState([]);
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([]);
  const [habilidadesSeleccionadas, setHabilidadesSeleccionadas] = useState([]);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState([]);
  const [filtrosNeeds, setFiltrosNeeds] = useState({
    necesita_estudiantes: false,
    necesita_asesor: false
  });

  const listaCategorias = Array.isArray(categorias) ? categorias : categorias?.results || [];
  const listaHabilidades = Array.isArray(habilidades) ? habilidades : habilidades?.results || [];
  const listaProyectos = Array.isArray(proyectos) ? proyectos : proyectos?.results || [];

  const OPCIONES_ESTADO = [
    { value: 'activo', label: 'Activo' },
    { value: 'en_progreso', label: 'En Progreso' },
    { value: 'terminado', label: 'Terminado' },
    { value: 'cancelado', label: 'Cancelado' },
  ];

  useEffect(() => {
    // Función para obtener filtros (categorias y habilidades)
    const obtenerFiltros = async () => {
      try {
        const [catRes, habRes] = await Promise.all([
          api.get('/api/categorias/'),
          api.get('/api/habilidades/')
        ]);

        setCategorias(catRes.data);
        setHabilidades(habRes.data);
      } catch (err) {
        console.error('Error obteniendo los filtros:', err);
      }
    };

    obtenerFiltros();
  }, []);

  useEffect(() => {
    // Función para obtener proyectos
    const obtenerProyectos = async () => {
      try {
        const parametros = new URLSearchParams();
        if (busqueda) parametros.append('busqueda', busqueda);
        categoriasSeleccionadas.forEach(cat => parametros.append('categoria', cat));
        habilidadesSeleccionadas.forEach(hab => parametros.append('habilidad', hab));
        estadoSeleccionado.forEach(e =>
          parametros.append('estado', e)
        );

        if (filtrosNeeds.necesita_estudiantes) {
          parametros.append('necesita_estudiantes', true);
        }

        if (filtrosNeeds.necesita_asesor) {
          parametros.append('necesita_asesor', true);
        }

        const res = await api.get(`/api/proyectos/?${parametros.toString()}`);
        setProyectos(res.data);
      } catch (err) {
        console.error('Error obteniendo proyectos:', err);
      }
    };

    const temporizador = setTimeout(obtenerProyectos, 300);
    return () => clearTimeout(temporizador);
  }, [busqueda, categoriasSeleccionadas, habilidadesSeleccionadas, estadoSeleccionado, filtrosNeeds.necesita_estudiantes, filtrosNeeds.necesita_asesor]);

  const handleCheckboxChange = (valor, lista, setLista) => {
    setLista(prev =>
      prev.includes(valor) ? prev.filter(id => id !== valor) : [...prev, valor]
    );
  };

  const toggleEstado = (estado) => {
    setEstadoSeleccionado(prev => {
      const isSelected = prev.includes(estado);

      if (isSelected) {
        return prev.filter(e => e !== estado);
      }

      if (['cancelado', 'terminado'].includes(estado)) {
        setFiltrosNeeds({
          necesita_estudiantes: false,
          necesita_asesor: false
        });

        return [estado];
      }

      return [
        ...prev.filter(e => !['cancelado', 'terminado'].includes(e)),
        estado
      ];
    });
  };

  return (
    <Container className="py-4">
      <h2 className="mb-4">Explora Proyectos</h2>

      <Row>
        <Col md={3}>
          <div
            className="sticky-top"
            style={{
              top: '80px',
              maxHeight: 'calc(100vh - 100px)',
              overflowY: 'auto',
              paddingRight: '8px'
            }}
          >
            <Form onSubmit={(e) => e.preventDefault()}>
              <Form.Group className="mb-3">
                <Form.Label>Buscar</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Buscar por nombre o descripción"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Estado del Proyecto</Form.Label>

                {OPCIONES_ESTADO.map(opt => (
                  <Form.Check
                    key={opt.value}
                    type="checkbox"
                    label={opt.label}
                    checked={estadoSeleccionado.includes(opt.value)}
                    onChange={() => toggleEstado(opt.value)}
                  />
                ))}
              </Form.Group>

              <Form.Check
                type="checkbox"
                label="Busca estudiantes"
                disabled={estadoSeleccionado.includes('cancelado') || estadoSeleccionado.includes('terminado')}
                checked={filtrosNeeds.necesita_estudiantes}
                onChange={() =>
                  setFiltrosNeeds(prev => ({
                    ...prev,
                    necesita_estudiantes: !prev.necesita_estudiantes
                  }))
                }
              />

              <Form.Check
                type="checkbox"
                label="Busca asesor"
                disabled={estadoSeleccionado.includes('cancelado') || estadoSeleccionado.includes('terminado')}
                checked={filtrosNeeds.necesita_asesor}
                onChange={() =>
                  setFiltrosNeeds(prev => ({
                    ...prev,
                    necesita_asesor: !prev.necesita_asesor
                  }))
                }
              />

              <Form.Group className="mb-3">
                <Form.Label>Categorias</Form.Label>
                {listaCategorias.map(cat => (
                  <Form.Check
                    key={cat.id}
                    type="checkbox"
                    label={cat.nombre}
                    checked={categoriasSeleccionadas.includes(cat.id)}
                    onChange={() => handleCheckboxChange(cat.id, categoriasSeleccionadas, setCategoriasSeleccionadas)}
                  />
                ))}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Habilidades Requeridas</Form.Label>
                {listaHabilidades.map(hab => (
                  <Form.Check
                    key={hab.id}
                    type="checkbox"
                    label={hab.nombre}
                    checked={habilidadesSeleccionadas.includes(hab.id)}
                    onChange={() => handleCheckboxChange(hab.id, habilidadesSeleccionadas, setHabilidadesSeleccionadas)}
                  />
                ))}
              </Form.Group>
            </Form>
          </div>
        </Col>

        <Col md={9}>
          <Row>
            {listaProyectos.length === 0 && (<p>No se encontraron proyectos.</p>)}
            {listaProyectos.map((proy) => (
              <Col md={6} lg={4} key={proy.id} className="mb-4">
                <Card className="h-100 shadow-sm">
                  <Card.Body className="d-flex flex-column">
                    <Card.Title>{proy.nombre}</Card.Title>

                    <div className="mt-2 d-flex gap-2 flex-wrap">
                      {proy.necesita_estudiantes && (
                        <span className="badge bg-warning">Busca estudiantes</span>
                      )}

                      {proy.necesita_asesor && (
                        <span className="badge bg-info">Busca asesor</span>
                      )}

                      {proy.estado === 'cancelado' && (
                        <span className="badge bg-danger">Cancelado</span>
                      )}
                    </div>

                    <Card.Text
                      style={{
                        whiteSpace: 'pre-line',
                        lineHeight: '1.8'
                      }}
                    >
                      {proy.descripcion.slice(0, 120)}...
                    </Card.Text>

                    {/* Team strip */}
                    <div className="mt-3">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <FaLightbulb size={24} className="me-1" title="Creador" />
                        {proy.creador && (
                          <AvatarBubble
                            usuario={proy.creador}
                            rol="creador"
                          />
                        )}
                      </div>

                      <div className="d-flex align-items-center gap-2 mb-2">
                        <FaGraduationCap size={24} className="me-1" title="Asesor" />
                        {proy.asesor ? (
                          <AvatarBubble
                            usuario={proy.asesor}
                            rol="asesor"
                          />
                        ) : (
                          <AvatarBubble
                            rol="vacante"
                            placeholder
                            tooltip="Buscando asesor"
                          />
                        )}
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <FaTools size={24} className="me-1" title="Equipo" />
                        {proy.estudiantes?.map((est) => (
                          <AvatarBubble
                            key={est.id}
                            usuario={est}
                            rol="estudiante"
                          />
                        ))}
                      </div>
                    </div>
                    <Button
                      href={`/proyectos/${proy.id}`}
                      variant="primary"
                      className="mt-auto"
                    >
                      Ver Proyecto
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Col>
      </Row>
    </Container>
  );
}

export default PaginaProyectos;
