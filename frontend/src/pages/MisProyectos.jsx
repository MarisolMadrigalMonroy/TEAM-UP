import { useEffect, useState } from "react";
import { Row, Col, Card, Button, Container } from "react-bootstrap";
import api from "../api";

function MisProyectos({ usuario }) {
  const [listaProyectos, setListaProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {

    const obtenerMisProyectos = async () => {
      try {
        const res = await api.get("/api/proyectos/");

        const userId = usuario.id;

        const filtrados = res.data.filter((proy) => {
          const creadorId =
            typeof proy.creador === "object"
              ? proy.creador?.id
              : proy.creador;

          const asesorId =
            typeof proy.asesor === "object"
              ? proy.asesor?.id
              : proy.asesor;

          const esEstudiante =
            proy.estudiantes?.some((est) =>
              (typeof est === "object" ? est.id : est) === userId
            );

          return (
            creadorId === userId ||
            asesorId === userId ||
            esEstudiante
          );
        });

        setListaProyectos(filtrados);
      } catch (err) {
        console.error("Error cargando mis proyectos:", err);
      } finally {
        setCargando(false);
      }
    };

    obtenerMisProyectos();
  }, [usuario?.id]);

  if (cargando) return <p>Cargando proyectos...</p>;

  const obtenerRol = (proy) => {
    const userId = usuario?.id;

    const creadorId =
      typeof proy.creador === "object"
      ? proy.creador?.id
      : proy.creador;

    const asesorId =
      typeof proy.asesor === "object"
      ? proy.asesor?.id
      : proy.asesor;

    const esEstudiante = proy.estudiantes?.some(
      (est) => (typeof est === "object" ? est.id : est) === userId
    );

    if (creadorId === userId) return "Creador";
    if (asesorId === userId) return "Asesor";
    if (esEstudiante) return "Estudiante";

    return "Participante";
  };

  return (
    <Container className="mt-4">
      <h2>Mis Proyectos</h2>
      <Row>
        {listaProyectos.length === 0 && (
          <p>No formas parte de ningún proyecto.</p>
        )}

        {listaProyectos.map((proy) => (
          <Col md={12} key={proy.id} className="mb-4">
            <Card>
              <Card.Body>
                <Card.Title>{proy.nombre}</Card.Title>
                <Card.Subtitle className="mb-2 text-muted">
                    Rol: {obtenerRol(proy)}
                </Card.Subtitle>
                <Card.Text
                  style={{
                    whiteSpace: 'pre-line',
                    lineHeight: '1.8'
                  }}
                >
                  {proy.descripcion}
                </Card.Text>
                <Button
                  href={`/proyectos/${proy.id}`}
                  variant="primary"
                >
                  Ver Proyecto
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}

export default MisProyectos;