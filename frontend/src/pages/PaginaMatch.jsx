import { useEffect, useState } from 'react';
import UsuariosSugeridos from './UsuariosSugeridos';
import ProyectosSugeridos from './ProyectosSugeridos';
import api from '../api';

/*
* Componente que representa la página para mostrar sugerencias de match 
*/
function PaginaMatch({ usuario }) {
  const [poseeProyectos, setPoseeProyectos] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!usuario?.id) return;

    const validarPropiedad = async () => {
      try {
        const res = await api.get('/api/proyectos/');
        const usuarioId = Number(usuario.id);

        const proyectosPoseidos = res.data.filter(proyecto => {
          const creadorId = proyecto.creador?.id;
          const asesorId = typeof proyecto.asesor === 'object'
            ? proyecto.asesor?.id
            : proyecto.asesor;

          return creadorId === usuarioId || asesorId === usuarioId;
        });
        console.log(usuario)

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
      {poseeProyectos ? (
        <>
          <UsuariosSugeridos tipoUsuario="estudiante" />
          <hr />
          <UsuariosSugeridos tipoUsuario="asesor" />
        </>
      ) : (
        <ProyectosSugeridos usuario={usuario} />
      )}
    </div>
  );
}

export default PaginaMatch;
