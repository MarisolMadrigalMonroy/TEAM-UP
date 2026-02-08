import { useEffect, useState } from 'react';
import { Container, Row, Col, Form, Card, Button } from 'react-bootstrap';
import api from '../api';

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [abilities, setAbilities] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedAbilities, setSelectedAbilities] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('');

  const categoryList = Array.isArray(categories) ? categories : categories?.results || [];
  const abilityList = Array.isArray(abilities) ? abilities : abilities?.results || [];
  const projectList = Array.isArray(projects) ? projects : projects?.results || [];

  const STATUS_OPTIONS = [
    { value: '', label: 'Todos los Estados' },
    { value: 'looking_students', label: 'Buscando Estudiantes' },
    { value: 'team_complete', label: 'Equipo Completo' },
    { value: 'looking_mentor', label: 'Buscando Asesor' },
    { value: 'in_progress', label: 'En Desarrollo' },
    { value: 'completed', label: 'Completo' },
    { value: 'cancelled', label: 'Cancellado' },
  ];

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [catRes, abRes] = await Promise.all([
          api.get('/api/categories/'),
          api.get('/api/abilities/')
        ]);
        console.log("categories: " + catRes.data);
        setCategories(catRes.data);
        setAbilities(abRes.data);
      } catch (err) {
        console.error('Error fetching filters:', err);
      }
    };

    fetchFilters();
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        selectedCategories.forEach(cat => params.append('category', cat));
        selectedAbilities.forEach(ab => params.append('ability', ab));
        if (selectedStatus) params.append('status', selectedStatus);

        const res = await api.get(`/api/projects/?${params.toString()}`);
        setProjects(res.data);
      } catch (err) {
        console.error('Error fetching projects:', err);
      }
    };

    const debounceTimer = setTimeout(fetchProjects, 300);
    return () => clearTimeout(debounceTimer);
  }, [search, selectedCategories, selectedAbilities, selectedStatus]);

  const handleCheckboxChange = (value, list, setList) => {
    setList(prev =>
      prev.includes(value) ? prev.filter(id => id !== value) : [...prev, value]
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Estado</Form.Label>
              <Form.Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Categorias</Form.Label>
              {categoryList.map(cat => (
                <Form.Check
                  key={cat.id}
                  type="checkbox"
                  label={cat.name}
                  checked={selectedCategories.includes(cat.id)}
                  onChange={() => handleCheckboxChange(cat.id, selectedCategories, setSelectedCategories)}
                />
              ))}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Habilidades Requeridas</Form.Label>
              {abilityList.map(ab => (
                <Form.Check
                  key={ab.id}
                  type="checkbox"
                  label={ab.name}
                  checked={selectedAbilities.includes(ab.id)}
                  onChange={() => handleCheckboxChange(ab.id, selectedAbilities, setSelectedAbilities)}
                />
              ))}
            </Form.Group>
          </Form>
        </Col>

        <Col md={9}>
          <Row>
            {projectList.length === 0 && <p>No projects found.</p>}
            {projectList.map(proj => (
              <Col md={6} lg={4} key={proj.id} className="mb-4">
                <Card>
                  <Card.Body>
                    <Card.Title>{proj.name}</Card.Title>
                    <Card.Text>{proj.description.slice(0, 120)}...</Card.Text>
                    <Button href={`/projects/${proj.id}`} variant="primary">
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
