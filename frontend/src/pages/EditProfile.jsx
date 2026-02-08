import { useEffect, useState } from 'react';
import api from '../api';
import { Form, Button, Container, Row, Col, Card } from 'react-bootstrap';

function EditProfile() {
    const [editing, setEditing] = useState(false);

    const [status, setStatus] = useState('');
    const [interests, setInterests] = useState([]);
    const [abilities, setAbilities] = useState([]);
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [selectedAbilities, setSelectedAbilities] = useState([]);
    const [bio, setBio] = useState('');

    const [originalStatus, setOriginalStatus] = useState('');
    const [originalInterests, setOriginalInterests] = useState([]);
    const [originalAbilities, setOriginalAbilities] = useState([]);
    const [originalBio, setOriginalBio] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [interestsRes, abilitiesRes, userRes] = await Promise.all([
                    api.get('/api/interests/'),
                    api.get('/api/abilities/'),
                    api.get('/api/user/me/')
                ]);
                setInterests(interestsRes.data);
                setAbilities(abilitiesRes.data);
                setStatus(userRes.data.status || '');
                setSelectedInterests(userRes.data.interests || []);
                setSelectedAbilities(userRes.data.abilities || []);
                setBio(userRes.data.bio || '');

                if (userRes.data.status==='available') {
                    setOriginalStatus('Buscando proyecto');
                } else if (userRes.data.status==='enrolled') {
                    setOriginalStatus('En un proyecto');
                } else {
                    setOriginalStatus('No estoy buscando proyecto');
                }
                
                setOriginalInterests(userRes.data.interests || []);
                setOriginalAbilities(userRes.data.abilities || []);
                setOriginalBio(userRes.data.bio || '');
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, []);

    const toggleInterest = (id) => {
        setSelectedInterests((prev) =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleAbility = (id) => {
        setSelectedAbilities((prev) =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put('/api/user/me/', {
                status,
                interests: selectedInterests,
                abilities: selectedAbilities,
                bio
            });

            setOriginalStatus(status);
            setOriginalInterests(selectedInterests);
            setOriginalAbilities(selectedAbilities);
            setOriginalBio(bio);

            alert('Perfil actualizado.');
            setEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Error actualizando el perfil.');
        }
    };

    return (
        <Container className="my-5">
        {!editing ? (
            <>
                <h2>Perfil</h2>
                <Card className="p-3">
                    <p><strong>Estado:</strong> <span className="badge bg-primary">{originalStatus}</span></p>
                    <p><strong>Biografía:</strong> {originalBio || '(No bio provided)'}</p>
                    <p><strong>Intereses:</strong> 
                        {originalInterests.length > 0
                            ? originalInterests
                                .map(id => interests.find(i => i.id === id)?.name)
                                .filter(Boolean)
                                .map(name => <span key={name} className="badge bg-success me-1">{name}</span>)
                            : '(Ninguno)'
                        }
                    </p>
                    <p><strong>Habilidades:</strong> 
                        {originalAbilities.length > 0
                            ? originalAbilities
                                .map(id => abilities.find(a => a.id === id)?.name)
                                .filter(Boolean)
                                .map(name => <span key={name} className="badge bg-info me-1">{name}</span>)
                            : '(Ninguna)'
                        }
                    </p>
                    <Button onClick={() => setEditing(true)}>Editar</Button>
                </Card>
            </>
        ) : (
            <>
                <h2>Editar Perfil</h2>
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label><h3>Estado</h3></Form.Label>
                        <Form.Select value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="available">Buscando proyecto</option>
                            <option value="enrolled">En un proyecto</option>
                            <option value="inactive">No estoy buscando proyecto</option>
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
                            {interests.map((interest) => (
                                <Col xs={12} md={6} key={interest.id}>
                                    <Form.Check
                                        type="checkbox"
                                        label={interest.name}
                                        checked={selectedInterests.includes(interest.id)}
                                        onChange={() => toggleInterest(interest.id)}
                                    />
                                </Col>
                            ))}
                        </Row>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label><h3>Habilidades</h3></Form.Label>
                        <Row>
                            {abilities.map((ability) => (
                                <Col xs={12} md={6} key={ability.id}>
                                    <Form.Check
                                        type="checkbox"
                                        label={ability.name}
                                        checked={selectedAbilities.includes(ability.id)}
                                        onChange={() => toggleAbility(ability.id)}
                                    />
                                </Col>
                            ))}
                        </Row>
                    </Form.Group>

                    <Button type="submit" className="me-2">Guardar Cambios</Button>
                    <Button variant="secondary" onClick={() => {
                        setEditing(false);
                        setStatus(originalStatus);
                        setSelectedInterests(originalInterests);
                        setSelectedAbilities(originalAbilities);
                        setBio(originalBio);
                    }}>Cancelar</Button>
                </Form>
            </>
        )}
        </Container>
    );
}

export default EditProfile;