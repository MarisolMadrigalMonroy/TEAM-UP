import { useEffect, useState } from 'react';
import api from '../api';
import { Form, Button, Container, Row, Col, Card } from 'react-bootstrap';

/*
* Componente para editar perfil de usuario
*/
function EditarPerfil() {
    const [editando, setEditando] = useState(false);
    const [estado, setEstado] = useState('');
    const [intereses, setIntereses] = useState([]);
    const [habilidades, setHabilidades] = useState([]);
    const [interesesSeleccionados, setInteresesSeleccionados] = useState([]);
    const [habilidadesSeleccionadas, setHabilidadesSeleccionadas] = useState([]);
    const [bio, setBio] = useState('');
    const [estadoOriginal, setEstadoOriginal] = useState('');
    const [interesesOriginales, setInteresesOriginales] = useState([]);
    const [habilidadesOriginales, setHabilidadesOriginales] = useState([]);
    const [bioOriginal, setBioOriginal] = useState('');

    useEffect(() => {
        // Función para obtener datos del usuario
        const obtenerDatos = async () => {
            try {
                const [interesesRes, habilidadesRes, usuarioRes] = await Promise.all([
                    api.get('/api/intereses/'),
                    api.get('/api/habilidades/'),
                    api.get('/api/usuario/yo/')
                ]);
                setIntereses(interesesRes.data);
                setHabilidades(habilidadesRes.data);
                setEstado(usuarioRes.data.estado || '');
                setInteresesSeleccionados(usuarioRes.data.intereses || []);
                setHabilidadesSeleccionadas(usuarioRes.data.habilidades || []);
                setBio(usuarioRes.data.bio || '');

                if (usuarioRes.data.estado==='disponible') {
                    setEstadoOriginal('Buscando Proyecto');
                } else if (usuarioRes.data.estado==='registrado') {
                    setEstadoOriginal('En un Proyecto');
                } else {
                    setEstadoOriginal('No Estoy Buscando Proyecto');
                }
                
                setInteresesOriginales(usuarioRes.data.intereses || []);
                setHabilidadesOriginales(usuarioRes.data.habilidades || []);
                setBioOriginal(usuarioRes.data.bio || '');
            } catch (error) {
                console.error('Error obteniendo datos:', error);
            }
        };
        obtenerDatos();
    }, []);

    // Función para actualizar intereses
    const actualizarIntereses = (id) => {
        setInteresesSeleccionados((prev) =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Función para actualizar habilidades
    const actualizarHabilidades = (id) => {
        setHabilidadesSeleccionadas((prev) =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put('/api/usuario/yo/', {
                estado: estado,
                intereses: interesesSeleccionados,
                habilidades: habilidadesSeleccionadas,
                bio
            });

            setEstadoOriginal(estado);
            setInteresesOriginales(interesesSeleccionados);
            setHabilidadesOriginales(habilidadesSeleccionadas);
            setBioOriginal(bio);

            alert('Perfil actualizado.');
            setEditando(false);
        } catch (error) {
            console.error('Error actualizando el perfil:', error);
            alert('Error actualizando el perfil.');
        }
    };

    return (
        <Container className="my-5">
        {!editando ? (
            <>
                <h2>Perfil</h2>
                <Card className="p-3">
                    <p><strong>Estado:</strong> <span className="badge bg-primary">{estadoOriginal}</span></p>
                    <p><strong>Biografía:</strong> {bioOriginal || '(No hay biografía)'}</p>
                    <p><strong>Intereses:</strong> 
                        {interesesOriginales.length > 0
                            ? interesesOriginales
                                .map(id => intereses.find(i => i.id === id)?.nombre)
                                .filter(Boolean)
                                .map(nombre => <span key={nombre} className="badge bg-success me-1">{nombre}</span>)
                            : '(Ninguno)'
                        }
                    </p>
                    <p><strong>Habilidades:</strong> 
                        {habilidadesOriginales.length > 0
                            ? habilidadesOriginales
                                .map(id => habilidades.find(hab => hab.id === id)?.nombre)
                                .filter(Boolean)
                                .map(nombre => <span key={nombre} className="badge bg-info me-1">{nombre}</span>)
                            : '(Ninguna)'
                        }
                    </p>
                    <Button onClick={() => setEditando(true)}>Editar</Button>
                </Card>
            </>
        ) : (
            <>
                <h2>Editar Perfil</h2>
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label><h3>Estado</h3></Form.Label>
                        <Form.Select value={estado} onChange={(e) => setEstado(e.target.value)}>
                            <option value="disponible">Buscando Proyecto</option>
                            <option value="registrado">En un Proyecto</option>
                            <option value="inactivo">No Estoy Buscando Proyecto</option>
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label><h3>Biografía</h3></Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label><h3>Intereses</h3></Form.Label>
                        <Row>
                            {intereses.map((interes) => (
                                <Col xs={12} md={6} key={interes.id}>
                                    <Form.Check
                                        type="checkbox"
                                        label={interes.nombre}
                                        checked={interesesSeleccionados.includes(interes.id)}
                                        onChange={() => actualizarIntereses(interes.id)}
                                    />
                                </Col>
                            ))}
                        </Row>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label><h3>Habilidades</h3></Form.Label>
                        <Row>
                            {habilidades.map((habilidad) => (
                                <Col xs={12} md={6} key={habilidad.id}>
                                    <Form.Check
                                        type="checkbox"
                                        label={habilidad.nombre}
                                        checked={habilidadesSeleccionadas.includes(habilidad.id)}
                                        onChange={() => actualizarHabilidades(habilidad.id)}
                                    />
                                </Col>
                            ))}
                        </Row>
                    </Form.Group>

                    <Button type="submit" className="me-2">Guardar Cambios</Button>
                    <Button variant="secondary" onClick={() => {
                        setEditando(false);
                        setEstado(estadoOriginal);
                        setInteresesSeleccionados(interesesOriginales);
                        setHabilidadesSeleccionadas(habilidadesOriginales);
                        setBio(bioOriginal);
                    }}>Cancelar</Button>
                </Form>
            </>
        )}
        </Container>
    );
}

export default EditarPerfil;