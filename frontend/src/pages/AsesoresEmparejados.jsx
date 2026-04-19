import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import { toast } from 'react-toastify';

/*
* Componente que representa la página de asesores con match 
*/
export default function AsesoresEmparejados({ refrescarNotificaciones }) {
  const { id } = useParams();
  const [asesoresConMatch, setAsesoresConMatch] = useState([]);
  const [proyecto, setProyecto] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerDatos();
  }, [id]);

  const obtenerDatos = async () => {
    setCargando(true);
    try {
      const [proyRes, asesoresRes] = await Promise.all([
        api.get(`/api/proyectos/${id}/`),
        api.get(`/api/proyectos/${id}/asesores-emparejados/`)
      ]);
      setProyecto(proyRes.data);
      setAsesoresConMatch(asesoresRes.data);
    } catch (err) {
      console.error("Error obteniendo proyecto o asesores con match", err);
    } finally {
      setCargando(false);
    }
  };

  const handleAccept = async (asesorId) => {
    try {
      const res = await api.post(`/api/proyectos/${id}/asignar-asesor/`, { asesor_id: asesorId });
      await obtenerDatos();
      await refrescarNotificaciones();
      toast.success(`🎉 Agregaste a ${res.data.usuario.username} en "${proyecto.nombre}"!`);
    } catch (err) {
      console.error("Error asignando asesor", err);
      alert("Error asignando el asesor");
    }
  };

  if (cargando) return <p>Cargando matches...</p>;

  return (
    <div className="container">
      <h2>Asesores que Hicieron Match</h2>
      {asesoresConMatch.length === 0 ? (
        <p>No se encontraron asesores con un match.</p>
      ) : (
        <ul>
          {asesoresConMatch.map((asesor) => (
            <li key={asesor.id} style={{ marginBottom: "10px" }}>
              <strong>{asesor.username}</strong> — {asesor.estado || "Sin estado"}
              <br />
              {asesor.bio && <em>{asesor.bio}</em>}
              <br />

              {proyecto?.asesor ? (
                asesor.id === proyecto.asesor.id ? (
                  <span className="badge bg-success">Asignado</span>
                ) : (
                  <span className="badge bg-secondary">El proyecto ya cuenta con asesor</span>
                )
              ) : asesor.estado === "inactivo"  ? (
                  <span className="badge bg-secondary">El asesor está inactivo</span>
              ) : (
                <button  className="btn btn-outline-success mt-2 w-10" onClick={() => handleAccept(asesor.id)}>Aceptar</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
