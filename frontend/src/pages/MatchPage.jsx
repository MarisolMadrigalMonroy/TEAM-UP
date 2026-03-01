import { useEffect, useState } from 'react';
import SuggestedUsers from './SuggestedUsers';
import SuggestedProjects from './SuggestedProjects';
import api from '../api';

/*
* Componente que representa la página para mostrar sugerencias de match 
*/
function MatchPage({ user }) {
  const [poseeProyectos, setPoseeProyectos] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
  if (!user?.id) return;

  const validarPropiedad = async () => {
    try {
      const res = await api.get('/api/projects/');
      const usuarioId = Number(user.id);

      const proyectosPoseidos = res.data.filter(proyecto => {
        const creadorId = proyecto.creator;
        const asesorId = typeof proyecto.mentor === 'object'
          ? proyecto.mentor?.id
          : proyecto.mentor;

        return creadorId === usuarioId || asesorId === usuarioId;
      });

      setPoseeProyectos(proyectosPoseidos.length > 0);
    } catch (err) {
      console.error('Error obteniendo proyectos:', err);
      setPoseeProyectos(false);
    } finally {
      setCargando(false);
    }
  };

  validarPropiedad();
}, [user?.id]);


  if (cargando) {
    return <div className="text-center my-5">Loading...</div>;
  }

  return (
    <div className="container py-4">
      {poseeProyectos ? (
        <>
          <SuggestedUsers userType="student" />
          <hr />
          <SuggestedUsers userType="mentor" />
        </>
      ) : (
        <SuggestedProjects user={user} />
      )}
    </div>
  );
}

export default MatchPage;
