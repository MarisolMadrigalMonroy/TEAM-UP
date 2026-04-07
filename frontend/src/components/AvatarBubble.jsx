import { Link } from "react-router-dom";

function AvatarBubble({ usuario, rol, placeholder = false, tooltip }) {
  const rolColor = {
    creador: "#0d6efd",
    asesor: "#6f42c1",
    estudiante: "#198754",
    vacante: "#adb5bd",
  };

  const initials = placeholder
    ? "+"
    : (usuario?.username || "??")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 2)
        .toUpperCase();

  const bubble = (
    <div
      title={tooltip || usuario?.username}
      style={{
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        backgroundColor: rolColor[rol] || "#adb5bd",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        fontSize: "0.9rem",
      }}
    >
      {initials}
    </div>
  );

  if (placeholder || !usuario?.id) return bubble;

  return (
    <Link
      to={`/perfil-publico/${usuario.id}`}
      className="text-decoration-none"
    >
      {bubble}
    </Link>
  );
}

export default AvatarBubble;