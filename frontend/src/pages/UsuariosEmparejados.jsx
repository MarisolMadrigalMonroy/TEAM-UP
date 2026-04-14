import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from '../api';
import { toast } from 'react-toastify';

/*
* Componente que representa la página de estudiantes con match 
*/
export default function UsuariosEmparejados({ refrescarNotificaciones }) {
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
        api.get(`/api/proyectos/${id}/`),
        api.get(`/api/proyectos/${id}/usuarios-emparejados/`)
      ]);

      const soloEstudiantes = usuarioRes.data.filter(
        usuario => usuario.tipo_usuario === "estudiante"
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
      const res = await api.post(`/api/proyectos/${id}/asignar-usuario/`, { usuario_id: usuarioId });
      await obtenerDatos();
      await refrescarNotificaciones();
      toast.success(`🎉 Agregaste a ${res.data.usuario.username} en "${proyecto.nombre}"!`);
    } catch (err) {
      console.error("Error asignando usuario", err);
      alert("Error asignando usuario");
    }
  };

  if (cargando) return <p>Cargando matches...</p>;

  const proyectoLleno = proyecto?.estudiantes?.length >= 3;

  return (
    <div className="container">
      <h2>Estudiantes que Hicieron Match</h2>
      {estudiantesConMatch.length === 0 ? (
        <p>No se encontraron estudiantes con un match.</p>
      ) : (
        <ul>
          {estudiantesConMatch.map((usuario) => (
            <li key={usuario.id} style={{ marginBottom: "10px" }}>
              <strong>{usuario.username}</strong> — {usuario.estado || "Sin estado"}
              <br />
              {usuario.bio && <em>{usuario.bio}</em>}
              <br />
              {usuario.asignado ? (
                <span className="badge bg-success">Aceptado</span>
              ) : usuario.registrado_previamente_en_otro_proyecto ? (
                <span className="badge bg-secondary">Aceptado en otro proyecto</span>
              ) : proyectoLleno ? (
                <span className="badge bg-warning text-dark">Equipo completo</span>
              ) : (
                <button className="btn btn-outline-success mt-2 w-10" onClick={() => handleAccept(usuario.id)}>Aceptar</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
