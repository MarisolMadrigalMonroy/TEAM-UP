import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

export default function MatchedMentors() {
  const { id } = useParams();
  const [matchedMentors, setMatchedMentors] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, mentorsRes] = await Promise.all([
        api.get(`/api/projects/${id}/`),
        api.get(`/api/projects/${id}/matched-mentors/`)
      ]);
      setProject(projRes.data);
      setMatchedMentors(mentorsRes.data);
    } catch (err) {
      console.error("Error fetching project or matched mentors", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (mentorId) => {
    try {
      await api.post(`/api/projects/${id}/assign-mentor/`, { mentor_id: mentorId });
      await fetchData();
      alert("Asesor asignado exitosamente!");
    } catch (err) {
      console.error("Error assigning mentor", err);
      alert("Error asignando el asesor");
    }
  };

  if (loading) return <p>Cargando matches...</p>;

  return (
    <div className="container">
      <h2>Asesores que Hicieron Match</h2>
      {matchedMentors.length === 0 ? (
        <p>No se encontraron asesores con un match.</p>
      ) : (
        <ul>
          {matchedMentors.map((mentor) => (
            <li key={mentor.id} style={{ marginBottom: "10px" }}>
              <strong>{mentor.username}</strong> — {mentor.status || "Sin estado"}
              <br />
              {mentor.bio && <em>{mentor.bio}</em>}
              <br />

              {project?.mentor ? (
                mentor.id === project.mentor.id ? (
                  <span className="badge bg-success">Asignado</span>
                ) : (
                  <span className="badge bg-secondary">El proyecto ya cuenta con asesor</span>
                )
              ) : (
                <button  className="btn btn-outline-success mt-2 w-10" onClick={() => handleAccept(mentor.id)}>Aceptar</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
