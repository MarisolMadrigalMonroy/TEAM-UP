import { useEffect, useState } from 'react';
import { Container, Row, Col, Form, Card, Button } from 'react-bootstrap';
import api from '../api';

/*
* Componente que representa la página para mostrar proyectos 
*/
function ProjectsPage() {
  const [proyectos, setProyectos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [habilidades, setHabilidades] = useState([]);
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([]);
  const [habilidadesSeleccionadas, setHabilidadesSeleccionadas] = useState([]);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('');

  const listaCategorias = Array.isArray(categorias) ? categorias : categorias?.results || [];
  const listaHabilidades = Array.isArray(habilidades) ? habilidades : habilidades?.results || [];
  const listaProyectos = Array.isArray(proyectos) ? proyectos : proyectos?.results || [];

  const OPCIONES_ESTADO = [
    { value: '', label: 'Todos los Estados' },
    { value: 'looking_students', label: 'Buscando Estudiantes' },
    { value: 'team_complete', label: 'Equipo Completo' },
    { value: 'looking_mentor', label: 'Buscando Asesor' },
    { value: 'in_progress', label: 'En Desarrollo' },
    { value: 'completed', label: 'Completo' },
    { value: 'cancelled', label: 'Cancelado' },
  ];

  useEffect(() => {
    // Función para obtener filtros (categorias y habilidades)
    const obtenerFiltros = async () => {
      try {
        const [catRes, habRes] = await Promise.all([
          api.get('/api/categories/'),
          api.get('/api/abilities/')
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
        if (busqueda) parametros.append('search', busqueda);
        categoriasSeleccionadas.forEach(cat => parametros.append('category', cat));
        habilidadesSeleccionadas.forEach(ab => parametros.append('ability', ab));
        if (estadoSeleccionado) parametros.append('status', estadoSeleccionado);

        const res = await api.get(`/api/projects/?${parametros.toString()}`);
        setProyectos(res.data);
      } catch (err) {
        console.error('Error obteniendo proyectos:', err);
      }
    };

    const temporizador = setTimeout(obtenerProyectos, 300);
    return () => clearTimeout(temporizador);
  }, [busqueda, categoriasSeleccionadas, habilidadesSeleccionadas, estadoSeleccionado]);

  const handleCheckboxChange = (valor, lista, setLista) => {
    setLista(prev =>
      prev.includes(valor) ? prev.filter(id => id !== valor) : [...prev, valor]
    );
  };

  return (
    <Container className="py-4">
      <h2 className="mb-4">Explora Proyectos</h2>

      <Row>
        <Col md={3}>
          <Form className="sticky-top" style={{ top: '80px' }}>
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
              <Form.Label>Estado</Form.Label>
              <Form.Select
                value={estadoSeleccionado}
                onChange={(e) => setEstadoSeleccionado(e.target.value)}
              >
                {OPCIONES_ESTADO.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Categorias</Form.Label>
              {listaCategorias.map(cat => (
                <Form.Check
                  key={cat.id}
                  type="checkbox"
                  label={cat.name}
                  checked={categoriasSeleccionadas.includes(cat.id)}
                  onChange={() => handleCheckboxChange(cat.id, categoriasSeleccionadas, setCategoriasSeleccionadas)}
                />
              ))}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Habilidades Requeridas</Form.Label>
              {listaHabilidades.map(ab => (
                <Form.Check
                  key={ab.id}
                  type="checkbox"
                  label={ab.name}
                  checked={habilidadesSeleccionadas.includes(ab.id)}
                  onChange={() => handleCheckboxChange(ab.id, habilidadesSeleccionadas, setHabilidadesSeleccionadas)}
                />
              ))}
            </Form.Group>
          </Form>
        </Col>

        <Col md={9}>
          <Row>
            {listaProyectos.length === 0 && <p>No se encontraron proyectos.</p>}
            {listaProyectos.map(proy => (
              <Col md={6} lg={4} key={proy.id} className="mb-4">
                <Card>
                  <Card.Body>
                    <Card.Title>{proy.name}</Card.Title>
                    <Card.Text>{proy.description.slice(0, 120)}...</Card.Text>
                    <Button href={`/projects/${proy.id}`} variant="primary">
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

export default ProjectsPage;
