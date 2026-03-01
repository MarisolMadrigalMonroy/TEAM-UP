import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from '../api';

/*
* Componente que representa la página de estudiantes con match 
*/
export default function MatchedUsers() {
  const { id } = useParams();
  const [estudiantesConMatch, setEstudiantesConMatch] = useState([]);
  const [proyecto, setProyecto] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerDatos();
  }, [id]);

  const obtenerDatos = async () => {
    setCargando(true);
    try {
      const [proyRes, usuarioRes] = await Promise.all([
        api.get(`/api/projects/${id}/`),
        api.get(`/api/projects/${id}/matched-users/`)
      ]);

      const soloEstudiantes = usuarioRes.data.filter(
        usuario => usuario.user_type === "student"
      );

      setProyecto(proyRes.data);
      setEstudiantesConMatch(soloEstudiantes);
    } catch (err) {
      console.error("Error obteniendo proyecto o estudiantes con match", err);
    } finally {
      setCargando(false);
    }
  };

  const handleAccept = async (usuarioId) => {
    try {
      await api.post(`/api/projects/${id}/assign-user/`, { user_id: usuarioId });
      await obtenerDatos();
      alert("¡Usuario agregado!");
    } catch (err) {
      console.error("Error asignando usuario", err);
      alert("Error asignando usuario");
    }
  };

  if (cargando) return <p>Cargando matches...</p>;

  const proyectoLleno = proyecto?.students?.length >= 3;

  return (
    <div className="container">
      <h2>Estudiantes que Hicieron Match</h2>
      {estudiantesConMatch.length === 0 ? (
        <p>No se encontraron estudiantes con un match.</p>
      ) : (
        <ul>
          {estudiantesConMatch.map((usuario) => (
            <li key={usuario.id} style={{ marginBottom: "10px" }}>
              <strong>{usuario.username}</strong> — {usuario.status || "Sin estado"}
              <br />
              {usuario.bio && <em>{usuario.bio}</em>}
              <br />
              {usuario.assigned ? (
                <span className="badge bg-success">Aceptado</span>
              ) : usuario.already_enrolled_in_other_project ? (
                <span className="badge bg-secondary">Aceptado en otro proyecto</span>
              ) : proyectoLleno ? (
                <span className="badge bg-warning text-dark">Equipo completo</span>
              ) : (
                <button onClick={() => handleAccept(usuario.id)}>Aceptar</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
