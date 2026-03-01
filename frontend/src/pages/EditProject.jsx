// src/pages/EditProject.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Button, Container, Alert, Row, Col } from 'react-bootstrap';
import api from '../api';

/*
* Componente para editar un proyecto
*/
function EditProject({ user }) {
    const { id } = useParams();
    const [proyecto, setProyecto] = useState(null);
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [estado, setEstado] = useState('');
    const [categorias, setCategorias] = useState([]);
    const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([]);
    const [habilidades, setHabilidades] = useState([]);
    const [habilidadesSeleccionadas, setHabilidadesSeleccionadas] = useState([]);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const STATUS_OPTIONS = [
        { value: 'looking_students', label: 'Buscando Estudiantes' },
        { value: 'team_complete', label: 'Equipo Completo' },
        { value: 'looking_mentor', label: 'Buscando Asesor' },
        { value: 'in_progress', label: 'En Desarrollo' },
        { value: 'completed', label: 'Completo' },
        { value: 'cancelled', label: 'Cancelado' }
    ];

    useEffect(() => {
        // Función para obtener datos del proyecto
        async function obtenerDatos() {
            try {
                const [proyRes, catRes, habRes] = await Promise.all([
                    api.get(`/api/projects/${id}/`),
                    api.get('/api/categories/'),
                    api.get('/api/abilities/')
                ]);

                const data = proyRes.data;
                setProyecto(data);
                if (!user || 
                    (user.id !== data.creator && user.id !== data.mentor?.id)
                ) {
                    alert('No estás autorizado para editar este proyecto.');
                    navigate(`/projects/${id}`);
                    return;
                }
                setNombre(data.name);
                setDescripcion(data.description);
                setEstado(data.status || 'looking_students');
                setCategoriasSeleccionadas(data.categories_details.map(cat => cat.id));
                setHabilidadesSeleccionadas(data.required_abilities_details.map(ab => ab.id));
                setCategorias(catRes.data);
                setHabilidades(habRes.data);
            } catch (err) {
                setError('Error cargando proyecto u opciones.');
                console.error(err);
            }
        }

        obtenerDatos();
    }, [id, navigate, user]);

    // Función para actualizar lista de opciones seleccionadas
    const handleCheckboxToggle = (id, listaSeleccionada, setListaSeleccionada) => {
        if (listaSeleccionada.includes(id)) {
            setListaSeleccionada(listaSeleccionada.filter(item => item !== id));
        } else {
            setListaSeleccionada([...listaSeleccionada, id]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/api/projects/${id}/`, {
                name: nombre,
                description: descripcion,
                status: estado,
                categories: categoriasSeleccionadas,
                required_abilities: habilidadesSeleccionadas,
            });
            navigate(`/projects/${id}`);
        } catch (err) {
            setError('Error al actualizar el proyecto.');
            console.error(err);
        }
    };

    if (!proyecto) return <Container><p>Cargando...</p></Container>;

    return (
        <Container className="py-5">
            <h2>Editar Proyecto</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                    <Form.Label>Nombre del Proyecto</Form.Label>
                    <Form.Control
                        type="text"
                        value={nombre}
                        onChange={e => setNombre(e.target.value)}
                        required
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Descripción</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={5}
                        value={descripcion}
                        onChange={e => setDescripcion(e.target.value)}
                        required
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Estado</Form.Label>
                    <Form.Select
                        value={estado}
                        onChange={(e) => setEstado(e.target.value)}
                    >
                        {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Categorías</Form.Label>
                    <Row>
                        {categorias.map(cat => (
                            <Col xs={12} md={6} key={cat.id}>
                                <Form.Check
                                    type="checkbox"
                                    label={cat.name}
                                    checked={categoriasSeleccionadas.includes(cat.id)}
                                    onChange={() => handleCheckboxToggle(cat.id, categoriasSeleccionadas, setCategoriasSeleccionadas)}
                                />
                            </Col>
                        ))}
                    </Row>
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Habilidades Requeridas</Form.Label>
                    <Row>
                        {habilidades.map(habilidad => (
                            <Col xs={12} md={6} key={habilidad.id}>
                                <Form.Check
                                    type="checkbox"
                                    label={habilidad.name}
                                    checked={habilidadesSeleccionadas.includes(habilidad.id)}
                                    onChange={() => handleCheckboxToggle(habilidad.id, habilidadesSeleccionadas, setHabilidadesSeleccionadas)}
                                />
                            </Col>
                        ))}
                    </Row>
                </Form.Group>

                <Button type="submit">Guardar Cambios</Button>
            </Form>
        </Container>
    );
}

export default EditProject;
