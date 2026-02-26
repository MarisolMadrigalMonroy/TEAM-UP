// src/pages/CreateProject.jsx
import { useState, useEffect } from 'react';
import { Form, Button, Container, Alert, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { obtenerPerfilUsuario } from '../auth';

function CreateProject({ setUser }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [abilities, setAbilities] = useState([]);
    const [selectedAbilities, setSelectedAbilities] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkUserAndLoadData = async () => {
            try {
                const userRes = await api.get('/api/user/me/');
                const user = userRes.data;
                console.log(user)

                if (user.user_type === 'student' && user.projects.length > 0) {
                    alert('You are already part of a project and cannot create a new one.');
                    navigate('/');
                    return;
                }

                const [catRes, abRes] = await Promise.all([
                    api.get('/api/categories/'),
                    api.get('/api/abilities/')
                ]);

                setCategories(catRes.data);
                setAbilities(abRes.data);
                setLoading(false);
            } catch (err) {
                console.error('Error checking user or loading options:', err);
                setError('Could not verify access or load data.');
            }
        };

        checkUserAndLoadData();
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const res = await api.post('/api/projects/', {
                name,
                description,
                categories: selectedCategories,
                required_abilities: selectedAbilities
            });
            const updatedUser = await obtenerPerfilUsuario();
            setUser(updatedUser);
            navigate(`/projects/${res.data.id}`);
        } catch (err) {
            console.error(err);
            setError('Could not create project');
        }
    };

    const handleCheckboxToggle = (id, selectedList, setSelectedList) => {
        if (selectedList.includes(id)) {
            setSelectedList(selectedList.filter(item => item !== id));
        } else {
            setSelectedList([...selectedList, id]);
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

                <Button type="submit">Crear</Button>
            </Form>
        </Container>
    );
}

export default CreateProject;
