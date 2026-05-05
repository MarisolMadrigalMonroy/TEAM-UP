import { useEffect, useState } from 'react';
import UsuariosSugeridos from './UsuariosSugeridos';
import ProyectosSugeridos from './ProyectosSugeridos';
import api from '../api';
import { useNavigate } from 'react-router-dom';

/*
* Componente que representa la página para mostrar sugerencias de match 
*/
function PaginaMatch({ usuario, refrescarNotificaciones }) {
  const [poseeProyectos, setPoseeProyectos] = useState(false);
  const [cargando, setCargando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!usuario?.id) return;

    const validarPropiedad = async () => {
      try {
        // Si el usuario es estudiante y es parte de un proyecto
        if (usuario.tipo_usuario === 'estudiante' && usuario.proyectos.length > 0 && usuario.proyectos_creados.length === 0) {
            alert('Ya eres parte de un proyecto, no puedes hacer match con otro.');
            navigate('/');
            return;
        }
        const res = await api.get('/api/proyectos/');
        const usuarioId = Number(usuario.id);

        const proyectosPoseidos = res.data.filter(proyecto => {
          const creadorId = typeof proyecto.creador === 'object'
            ? proyecto.creador?.id
            : proyecto.creador;
          const asesorId = typeof proyecto.asesor === 'object'
            ? proyecto.asesor?.id
            : proyecto.asesor;

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
  }, [usuario?.id]);


  if (cargando) {
    return <div className="text-center my-5">Loading...</div>;
  }

  return (
    <div className="container py-4">
      {poseeProyectos && (
        <>
          <UsuariosSugeridos tipoUsuario="estudiante" refrescarNotificaciones={refrescarNotificaciones} />

          {usuario?.tipo_usuario !== 'asesor' && (
            <>
              <hr />
              <UsuariosSugeridos tipoUsuario="asesor" refrescarNotificaciones={refrescarNotificaciones} />
            </>
          )}

          <hr />
        </>
      )}

      {(usuario?.tipo_usuario === 'asesor' || !poseeProyectos) && (
        <ProyectosSugeridos usuario={usuario} refrescarNotificaciones={refrescarNotificaciones} />
      )}
    </div>
  );
}

export default PaginaMatch;
