// src/pages/CrearProyecto.jsx
import { useState, useEffect } from 'react';
import { Form, Button, Container, Alert, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { obtenerPerfilUsuario } from '../auth';

/*
 * Componente para crear un proyeccto
*/
function CrearProyecto({ setUsuario }) {
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [categorias, setCategorias] = useState([]);
    const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([]);
    const [habilidades, setHabilidades] = useState([]);
    const [habilidadesSeleccionadas, setHabilidadesSeleccionadas] = useState([]);
    const [error, setError] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [errorMensaje, setErrorMensaje] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const validarUsuarioYCargarDatos = async () => {
            try {
                const usuarioRes = await api.get('/api/usuario/yo/');
                const usuario = usuarioRes.data;

                // Si el usuario es estudiante y es parte de un proyecto
                if (usuario.tipo_usuario === 'estudiante' && usuario.proyectos.length > 0) {
                    alert('Ya eres parte de un proyecto, no puedes crear uno nuevo.');
                    navigate('/');
                    return;
                }

                const [catRes, habRes] = await Promise.all([
                    api.get('/api/categorias/'),
                    api.get('/api/habilidades/')
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
        setErrorMensaje('');

        if (!descripcion.trim()) {
            setErrorMensaje('La descripción del proyecto es obligatoria.');
            return;
        }

        if (!nombre.trim()) {
            setErrorMensaje('El nombre del proyecto es obligatorio.');
            return;
        }

        try {
            const res = await api.post('/api/proyectos/', {
                nombre: nombre,
                descripcion: descripcion,
                categorias: categoriasSeleccionadas,
                habilidades_requeridas: habilidadesSeleccionadas
            });
            const usuarioActualizado = await obtenerPerfilUsuario();
            setUsuario(usuarioActualizado);
            navigate(`/proyectos/${res.data.id}`);
        } catch (err) {
            console.error(err);
            setErrorMensaje('No se pudo crear el proyecto.');
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
            {errorMensaje && (
                <Alert
                    variant="danger"
                    dismissible
                    onClose={() => setErrorMensaje('')}
                >
                    {errorMensaje}
                </Alert>
            )}
            <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                    <Form.Label>Nombre del Proyecto</Form.Label>
                    <Form.Control
                        type="text"
                        value={nombre}
                        onChange={e => setNombre(e.target.value)}
                        isInvalid={!!errorMensaje && !nombre.trim()}
                        maxLength={100}
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Descripción</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={5}
                        value={descripcion}
                        onChange={e => setDescripcion(e.target.value)}
                        isInvalid={!!errorMensaje && !descripcion.trim()}
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Categorías</Form.Label>
                    <Row>
                        {categorias.map(cat => (
                            <Col xs={12} md={6} key={cat.id}>
                                <Form.Check
                                    type="checkbox"
                                    label={cat.nombre}
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
                                    label={habilidad.nombre}
                                    checked={habilidadesSeleccionadas.includes(habilidad.id)}
                                    onChange={() => handleCheckboxToggle(habilidad.id, habilidadesSeleccionadas, setHabilidadesSeleccionadas)}
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

export default CrearProyecto;
