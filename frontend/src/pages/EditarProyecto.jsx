// src/pages/EditarProyecto.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Button, Container, Alert, Row, Col } from 'react-bootstrap';
import api from '../api';

/*
* Componente para editar un proyecto
*/
function EditarProyecto({ usuario }) {
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
    const [errorMensaje, setErrorMensaje] = useState('');
    const navigate = useNavigate();

    const STATUS_OPTIONS = [
        { value: 'buscando_estudiantes', label: 'Buscando Estudiantes' },
        { value: 'equipo_completo', label: 'Equipo Completo' },
        { value: 'buscando_asesor', label: 'Buscando Asesor' },
        { value: 'en_progreso', label: 'En Progreso' },
        { value: 'terminado', label: 'Terminado' },
        { value: 'cancelado', label: 'Cancelado' }
    ];

    useEffect(() => {
        // Función para obtener datos del proyecto
        async function obtenerDatos() {
            try {
                const [proyRes, catRes, habRes] = await Promise.all([
                    api.get(`/api/proyectos/${id}/`),
                    api.get('/api/categorias/'),
                    api.get('/api/habilidades/')
                ]);

                const data = proyRes.data;
                setProyecto(data);
                if (!usuario || 
                    (usuario.id !== data.creador?.id && usuario.id !== data.asesor?.id)
                ) {
                    alert('No estás autorizado para editar este proyecto.');
                    navigate(`/proyectos/${id}`);
                    return;
                }
                setNombre(data.nombre);
                setDescripcion(data.descripcion);
                setEstado(data.estado || 'buscando_estudiantes');
                setCategoriasSeleccionadas(data.detalles_categorias.map(cat => cat.id));
                setHabilidadesSeleccionadas(data.detalles_habilidades_requeridas.map(hab => hab.id));
                setCategorias(catRes.data);
                setHabilidades(habRes.data);
            } catch (err) {
                setErrorMensaje('Error cargando proyecto u opciones.');
                console.error(err);
            }
        }

        obtenerDatos();
    }, [id, navigate, usuario]);

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
        setErrorMensaje('');

        if (!descripcion.trim()) {
            setErrorMensaje('La descripción del proyecto es obligatoria.');
            return;
        }

        if (descripcion.trim().length < 5) {
            setErrorMensaje('La descripción debe tener al menos 5 caracteres.');
            return;
        }

        if (!nombre.trim()) {
            setErrorMensaje('El nombre del proyecto es obligatorio.');
            return;
        }

        if (categoriasSeleccionadas.length === 0) {
            setErrorMensaje('Selecciona al menos una categoría.');
            return;
        }

        if (habilidadesSeleccionadas.length === 0) {
            setErrorMensaje('Selecciona al menos una habilidad requerida.');
            return;
        }

        try {
            await api.put(`/api/proyectos/${id}/`, {
                nombre: nombre,
                descripcion: descripcion,
                estado: estado,
                categorias: categoriasSeleccionadas,
                habilidades_requeridas: habilidadesSeleccionadas,
            });
            navigate(`/proyectos/${id}`);
        } catch (err) {
            setErrorMensaje('Error al actualizar el proyecto.');
            console.error(err);
        }
    };

    if (!proyecto) return <Container><p>Cargando...</p></Container>;

    return (
        <Container className="py-5">
            <h2>Editar Proyecto</h2>
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

                <Button type="submit">Guardar Cambios</Button>
            </Form>
        </Container>
    );
}

export default EditarProyecto;
