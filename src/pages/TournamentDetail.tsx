import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AllTournaments.css"; // Reutilizamos estilos

const API_URL = "http://localhost:3001";

const TournamentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      fetchTournament();
    }
  }, [id]);

  const fetchTournament = async () => {
    try {
      const response = await fetch(`${API_URL}/torneos/${id}`);
      if (!response.ok) throw new Error("Torneo no encontrado");
      const data = await response.json();
      setTournament(data);
    } catch (err) {
      setError("No se pudo cargar el torneo");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!isLoggedIn) {
      alert("Debes iniciar sesión para inscribirte");
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/inscripciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: user?.id,
          torneo_id: parseInt(id!)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Error al inscribirse");
        return;
      }

      alert("¡Inscripción exitosa!");
      fetchTournament(); // Recargar para actualizar contadores
    } catch (err) {
      alert("Error al conectar con el servidor");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Por definir";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const getStatusInfo = () => {
    if (!tournament) return { message: "", className: "", available: false };
    
    const currentDate = new Date();
    const endDate = new Date(tournament.endDate);
    const isDateExpired = currentDate > endDate;
    const isFull = tournament.registeredPlayers >= tournament.players;

    if (isDateExpired) {
      return { message: "Torneo finalizado", className: "status-closed", available: false };
    } else if (isFull) {
      return { message: "Torneo cerrado - Cupo lleno", className: "status-full", available: false };
    } else {
      const availableSpots = tournament.players - tournament.registeredPlayers;
      return { message: `Disponible - ${availableSpots} cupos`, className: "status-available", available: true };
    }
  };

  if (loading) {
    return (
      <main className="all-tournaments">
        <div style={{ textAlign: "center", padding: "100px", color: "white" }}>
          <p>Cargando torneo...</p>
        </div>
      </main>
    );
  }

  if (error || !tournament) {
    return (
      <main className="all-tournaments">
        <div className="no-results" style={{ margin: "40px auto", maxWidth: "600px" }}>
          <span className="no-results-icon">😕</span>
          <h3>Torneo no encontrado</h3>
          <p>El torneo que buscas no existe o ha sido eliminado</p>
          <Link to="/torneos" className="register-btn" style={{ marginTop: "20px", display: "inline-block" }}>
            Ver todos los torneos
          </Link>
        </div>
      </main>
    );
  }

  const statusInfo = getStatusInfo();

  return (
    <main className="all-tournaments">
      <section className="tournaments-hero" style={{ height: "50vh" }}>
        <div className="tournaments-hero-overlay"></div>
        <div className="tournaments-hero-content">
          <h1>{tournament.name}</h1>
          <p>{tournament.game}</p>
        </div>
      </section>

      <section className="tournaments-results">
        <div className={`tournament-item ${statusInfo.className}`} style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div className="tournament-item-header">
            <h3>Detalles del Torneo</h3>
            <span className={`status-badge ${statusInfo.className}`}>
              {statusInfo.message}
            </span>
          </div>
          
          <div className="tournament-item-details">
            <div className="detail">
              <span className="detail-icon">🎮</span>
              <span>{tournament.game || "Por definir"}</span>
            </div>
            <div className="detail">
              <span className="detail-icon">🏆</span>
              <span>{tournament.type || "Formato por definir"}</span>
            </div>
            <div className="detail">
              <span className="detail-icon">👥</span>
              <span>{tournament.registeredPlayers}/{tournament.players} jugadores</span>
            </div>
            <div className="detail">
              <span className="detail-icon">📅</span>
              <span>Inicio: {formatDate(tournament.startDate)}</span>
            </div>
            <div className="detail">
              <span className="detail-icon">🏁</span>
              <span>Fin: {formatDate(tournament.endDate)}</span>
            </div>
            {tournament.prize && (
              <div className="detail">
                <span className="detail-icon">🎁</span>
                <span>{tournament.prize}</span>
              </div>
            )}
          </div>

          {tournament.description && (
            <div style={{ marginBottom: "20px", padding: "20px", background: "#1a1a2e", borderRadius: "10px" }}>
              <h4 style={{ color: "#00ccff", marginBottom: "10px" }}>Descripción</h4>
              <p style={{ color: "#b0b0c0", lineHeight: "1.6" }}>{tournament.description}</p>
            </div>
          )}

          {tournament.rules && (
            <div style={{ marginBottom: "20px", padding: "20px", background: "#1a1a2e", borderRadius: "10px" }}>
              <h4 style={{ color: "#00ccff", marginBottom: "10px" }}>Reglas</h4>
              <p style={{ color: "#b0b0c0", lineHeight: "1.6" }}>{tournament.rules}</p>
            </div>
          )}

          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${Math.min((tournament.registeredPlayers / tournament.players) * 100, 100)}%` }}
              ></div>
            </div>
            <span className="progress-text">
              {Math.round((tournament.registeredPlayers / tournament.players) * 100)}% completado
            </span>
          </div>

          <div className="tournament-item-footer" style={{ justifyContent: "space-between" }}>
            <Link to="/torneos" className="view-btn">
              ← Volver a torneos
            </Link>
            {statusInfo.available ? (
              <button 
                className="register-btn"
                onClick={handleRegister}
              >
                Inscribirse al Torneo
              </button>
            ) : (
              <button className="register-btn disabled" disabled>
                {statusInfo.message}
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

export default TournamentDetail;