// src/pages/EditarProyecto.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Button, Container, Alert, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../api';

/*
* Componente para editar un proyecto
*/
function EditarProyecto({ usuario }) {
    const { id } = useParams();
    const [proyecto, setProyecto] = useState(null);
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [categorias, setCategorias] = useState([]);
    const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([]);
    const [habilidades, setHabilidades] = useState([]);
    const [habilidadesSeleccionadas, setHabilidadesSeleccionadas] = useState([]);
    const [errorMensaje, setErrorMensaje] = useState('');
    const navigate = useNavigate();

    const estadoLabel = {
        buscando_estudiantes: "Buscando estudiantes",
        buscando_asesor: "Buscando asesor",
        en_progreso: "En progreso",
        terminado: "Terminado",
        cancelado: "Cancelado"
    };

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

        if (proyecto.estado === 'cancelado' || proyecto.estado === 'terminado') {
            setErrorMensaje('Este proyecto ya no puede modificarse.');
            return;
        }

        try {
            await api.put(`/api/proyectos/${id}/`, {
                nombre: nombre,
                descripcion: descripcion,
                categorias: categoriasSeleccionadas,
                habilidades_requeridas: habilidadesSeleccionadas,
            });
            navigate(`/proyectos/${id}`);
        } catch (err) {
            setErrorMensaje('Error al actualizar el proyecto.');
            console.error(err);
        }
    };

    const actualizarEstado = async (nuevoEstado) => {
        try {
            await api.patch(`/api/proyectos/${id}/`, {
                estado: nuevoEstado
            });

            setProyecto(prev => ({
                ...prev,
                estado: nuevoEstado
            }));

            if (nuevoEstado === 'terminado') {
                toast.success(`✅ Proyecto marcado como terminado`);
            } else if (nuevoEstado === 'cancelado') {
                toast.error(`🚫 Proyecto cancelado`);
            }

        } catch (err) {
            console.error('Error actualizando estado:', err);
            toast.error('No se pudo actualizar el estado del proyecto.');
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
                    <div className="mt-3 d-flex gap-2 flex-wrap">
                        <Form.Label>Estado</Form.Label>
                        <span className="badge bg-primary">
                            {estadoLabel[proyecto.estado]}
                        </span>
                    </div>
                    {proyecto.estado !== 'terminado' && proyecto.estado !== 'cancelado' && (
                    <div className="d-flex justify-content-end gap-2 mt-3 flex-wrap">
                        <Button
                        variant="outline-success"
                        onClick={() => actualizarEstado('terminado')}
                        >
                        Marcar como terminado
                        </Button>

                        <Button
                        variant="outline-danger"
                        onClick={() => actualizarEstado('cancelado')}
                        >
                        Cancelar proyecto
                        </Button>
                    </div>
                    )}
                    <div className="mt-3 d-flex gap-2 flex-wrap">
                        {proyecto.necesita_estudiantes && (
                            <span className="badge bg-warning text-dark">
                                Buscando estudiantes
                            </span>
                        )}

                        {proyecto.necesita_asesor && (
                            <span className="badge bg-info text-dark">
                                Buscando asesor
                            </span>
                        )}
                    </div>
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
