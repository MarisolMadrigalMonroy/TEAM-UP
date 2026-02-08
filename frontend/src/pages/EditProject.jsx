// src/pages/EditProject.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Button, Container, Alert, Row, Col } from 'react-bootstrap';
import api from '../api';

function EditProject({ user }) {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [abilities, setAbilities] = useState([]);
    const [selectedAbilities, setSelectedAbilities] = useState([]);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const STATUS_OPTIONS = [
        { value: 'looking_students', label: 'Looking for Students' },
        { value: 'team_complete', label: 'Team Complete' },
        { value: 'looking_mentor', label: 'Looking for Mentor' },
        { value: 'in_progress', label: 'Under Development' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
    ];

    useEffect(() => {
        async function fetchData() {
            try {
                const [projRes, catRes, abRes] = await Promise.all([
                    api.get(`/api/projects/${id}/`),
                    api.get('/api/categories/'),
                    api.get('/api/abilities/')
                ]);

                const data = projRes.data;
                setProject(data);
                if (!user || 
                    (user.id !== data.creator && user.id !== data.mentor?.id)
                ) {
                    alert('You are not authorized to edit this project.');
                    navigate(`/projects/${id}`);
                    return;
                }
                setName(data.name);
                setDescription(data.description);
                setStatus(data.status || 'looking_students');
                setSelectedCategories(data.categories_details.map(cat => cat.id));
                setSelectedAbilities(data.required_abilities_details.map(ab => ab.id));
                setCategories(catRes.data);
                setAbilities(abRes.data);
            } catch (err) {
                setError('Failed to load project or options.');
                console.error(err);
            }
        }

        fetchData();
    }, [id, navigate, user]);

    const handleCheckboxToggle = (id, list, setter) => {
        if (list.includes(id)) {
            setter(list.filter(item => item !== id));
        } else {
            setter([...list, id]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/api/projects/${id}/`, {
                name,
                description,
                status,
                categories: selectedCategories,
                required_abilities: selectedAbilities,
            });
            navigate(`/projects/${id}`);
        } catch (err) {
            setError('Failed to update project.');
            console.error(err);
        }
    };

    if (!project) return <Container><p>Loading...</p></Container>;

    return (
        <Container className="py-5">
            <h2>Editar Proyecto</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                    <Form.Label>Nombre del Proyecto</Form.Label>
                    <Form.Control
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Descripción</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={5}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        required
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Estado</Form.Label>
                    <Form.Select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
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
                        {categories.map(cat => (
                            <Col xs={12} md={6} key={cat.id}>
                                <Form.Check
                                    type="checkbox"
                                    label={cat.name}
                                    checked={selectedCategories.includes(cat.id)}
                                    onChange={() => handleCheckboxToggle(cat.id, selectedCategories, setSelectedCategories)}
                                />
                            </Col>
                        ))}
                    </Row>
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Habilidades Requeridas</Form.Label>
                    <Row>
                        {abilities.map(ability => (
                            <Col xs={12} md={6} key={ability.id}>
                                <Form.Check
                                    type="checkbox"
                                    label={ability.name}
                                    checked={selectedAbilities.includes(ability.id)}
                                    onChange={() => handleCheckboxToggle(ability.id, selectedAbilities, setSelectedAbilities)}
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
