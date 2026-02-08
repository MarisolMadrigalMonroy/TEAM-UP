import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from '../api';

export default function MatchedUsers() {
  const { id } = useParams();
  const [matchedUsers, setMatchedUsers] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, usersRes] = await Promise.all([
        api.get(`/api/projects/${id}/`),
        api.get(`/api/projects/${id}/matched-users/`)
      ]);

      const studentsOnly = usersRes.data.filter(
        user => user.user_type === "student"
      );

      setProject(projRes.data);
      setMatchedUsers(usersRes.data);
    } catch (err) {
      console.error("Error fetching project or matched users", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (userId) => {
    try {
      await api.post(`/api/projects/${id}/assign-user/`, { user_id: userId });
      await fetchData();
      alert("¡Usuario agregado!");
    } catch (err) {
      console.error("Error assigning user", err);
      alert("Failed to assign user");
    }
  };

  if (loading) return <p>Cargando matches...</p>;

  const isProjectFull = project?.students?.length >= 3;

  return (
    <div className="container">
      <h2>Estudiantes que Hicieron Match</h2>
      {matchedUsers.length === 0 ? (
        <p>No se encontraron estudiantes con un match.</p>
      ) : (
        <ul>
          {matchedUsers.map((user) => (
            <li key={user.id} style={{ marginBottom: "10px" }}>
              <strong>{user.username}</strong> — {user.status || "Sin estado"}
              <br />
              {user.bio && <em>{user.bio}</em>}
              <br />
              {user.assigned ? (
                <span className="badge bg-success">Aceptado</span>
              ) : user.already_enrolled_in_other_project ? (
                <span className="badge bg-secondary">Aceptado en otro proyecto</span>
              ) : isProjectFull ? (
                <span className="badge bg-warning text-dark">Equipo completo</span>
              ) : (
                <button onClick={() => handleAccept(user.id)}>Aceptar</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
