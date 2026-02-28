// src/pages/CreateProject.jsx
import { useState, useEffect } from 'react';
import { Form, Button, Container, Alert, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { obtenerPerfilUsuario } from '../auth';

/*
 * Componente para crear un proyeccto
*/
function CreateProject({ setUser }) {
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [categorias, setCategorias] = useState([]);
    const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([]);
    const [habilidades, setHabilidades] = useState([]);
    const [habilidadesSeleccionadas, setHabilidadesSeleccionadas] = useState([]);
    const [error, setError] = useState(null);
    const [cargando, setCargando] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const validarUsuarioYCargarDatos = async () => {
            try {
                const usuarioRes = await api.get('/api/user/me/');
                const usuario = usuarioRes.data;

                // Si el usuario es estudiante y es parte de un proyecto
                if (usuario.user_type === 'student' && usuario.projects.length > 0) {
                    alert('Ya eres parte de un proyecto, no puedes crear uno nuevo.');
                    navigate('/');
                    return;
                }

                const [catRes, habRes] = await Promise.all([
                    api.get('/api/categories/'),
                    api.get('/api/abilities/')
                ]);

                setCategorias(catRes.data);
                setHabilidades(habRes.data);
                setCargando(false);
            } catch (err) {
                console.error('Error validando usuario o cargando opciones:', err);
                setError('No se pudieron verificar accesos o cargar opciones.');
            }
        };

        validarUsuarioYCargarDatos();
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const res = await api.post('/api/projects/', {
                name: nombre,
                description: descripcion,
                categories: categoriasSeleccionadas,
                required_abilities: habilidadesSeleccionadas
            });
            const usuarioActualizado = await obtenerPerfilUsuario();
            setUser(usuarioActualizado);
            navigate(`/projects/${res.data.id}`);
        } catch (err) {
            console.error(err);
            setError('No se pudo crear el proyecto.');
        }
    };

    // Función para actualizar lista de opciones seleccionadas
    const handleCheckboxToggle = (id, listaSeleccionada, setListaSeleccionada) => {
        if (listaSeleccionada.includes(id)) {
            setListaSeleccionada(listaSeleccionada.filter(item => item !== id));
        } else {
            setListaSeleccionada([...listaSeleccionada, id]);
        }
    };

    return (
        <Container className="py-5">
            <h2 className="mb-4">Crea un Proyecto</h2>
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
                        {habilidades.map(ability => (
                            <Col xs={12} md={6} key={ability.id}>
                                <Form.Check
                                    type="checkbox"
                                    label={ability.name}
                                    checked={habilidadesSeleccionadas.includes(ability.id)}
                                    onChange={() => handleCheckboxToggle(ability.id, habilidadesSeleccionadas, setHabilidadesSeleccionadas)}
                                />
                            </Col>
                        ))}
                    </Row>
                </Form.Group>

                <Button type="submit">Crear</Button>
            </Form>
        </Container>
    );
}

export default CreateProject;
