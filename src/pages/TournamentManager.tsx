import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./TournamentManager.css";

const API_URL = "http://localhost:3001";

const TournamentManager = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showLoginWarning, setShowLoginWarning] = useState(false);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar torneos desde la API
  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const response = await fetch(`${API_URL}/torneos`);
      if (response.ok) {
        const data = await response.json();
        setTournaments(data);
      }
    } catch (err) {
      console.error("Error al cargar torneos:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTournamentStatus = (tournament: any) => {
    const currentDate = new Date();
    const endDate = new Date(tournament.endDate);
    const isDateExpired = currentDate > endDate;
    const isFull = tournament.registeredPlayers >= tournament.players;

    if (isDateExpired) return "Torneo finalizado";
    if (isFull || tournament.status === 'finalizado') return "Torneo cerrado - Cupo lleno";
    const availableSpots = tournament.players - tournament.registeredPlayers;
    return `Disponible - ${availableSpots} cupos`;
  };

  const getRecentTournaments = () => {
    return [...tournaments]
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .slice(0, 3)
      .map(tournament => ({
        id: tournament.id,
        name: tournament.name,
        game: tournament.game,
        players: tournament.players,
        startDate: tournament.startDate ? new Date(tournament.startDate).toLocaleDateString("es-ES", {
          day: "2-digit", month: "2-digit", year: "numeric"
        }) : "Fecha por definir",
        status: getTournamentStatus(tournament),
        participants: tournament.registeredPlayers,
        totalPlayers: tournament.players
      }));
  };

  const activeTournaments = getRecentTournaments();

  const handleCreateTournament = () => {
    if (!isLoggedIn) {
      setShowLoginWarning(true);
      setSelectedOption("create");
    } else {
      navigate("/crear-torneo");
    }
  };

  const handleEditTournament = () => {
    if (!isLoggedIn) {
      setShowLoginWarning(true);
      setSelectedOption("edit");
    } else {
      navigate("/editar-torneo");
    }
  };

  const handleCloseWarning = () => {
    setShowLoginWarning(false);
    setSelectedOption(null);
  };

  const getStatusClass = (status: string) => {
    if (status.includes("Disponible")) return "status-available";
    if (status.includes("cerrado") || status.includes("Cupo lleno")) return "status-full";
    if (status.includes("finalizado")) return "status-closed";
    return "status-available";
  };

  return (
    <main className="tournament-manager">
      <section className="manager-hero">
        <div className="manager-hero-overlay"></div>
        <div className="manager-hero-content">
          <h1>GESTIÓN DE TORNEOS</h1>
          <p>Crea, edita y administra tus competencias desde un solo lugar</p>
        </div>
      </section>

      <section className="action-selector">
        <h2>¿Qué deseas hacer?</h2>
        <div className="action-buttons">
          <button
            className={`action-btn create-btn ${selectedOption === "create" && showLoginWarning ? "warning" : ""}`}
            onClick={handleCreateTournament}
          >
            <span className="btn-icon">🏆</span>
            Crear Torneo
          </button>
          <button
            className={`action-btn edit-btn ${selectedOption === "edit" && showLoginWarning ? "warning" : ""}`}
            onClick={handleEditTournament}
          >
            <span className="btn-icon">✏️</span>
            Editar Torneo
          </button>
        </div>

        {showLoginWarning && (
          <div className="login-warning">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <h3>Necesitas una cuenta</h3>
              <p>
                Para {selectedOption === "create" ? "crear un nuevo torneo" : "editar un torneo existente"}{" "}
                es necesario tener una cuenta activa en Bracket Core.
              </p>
              <div className="warning-buttons">
                <Link to="/login" className="warning-login-btn">Iniciar Sesión</Link>
                <Link to="/registro" className="warning-register-btn">Registrarse Gratis</Link>
                <button onClick={handleCloseWarning} className="warning-close-btn">Cerrar</button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="active-tournaments">
        <div className="section-header">
          <h2>🏆 Torneos Recientes</h2>
          <Link to="/torneos" className="view-all-link">Ver todos →</Link>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#b0b0c0" }}>
            <p>Cargando torneos...</p>
          </div>
        ) : (
          <div className="tournaments-grid">
            {activeTournaments.map((tournament) => (
              <div className={`tournament-card-active ${getStatusClass(tournament.status)}`} key={tournament.id}>
                <div className={`tournament-status ${getStatusClass(tournament.status)}`}>
                  {tournament.status}
                </div>
                <h3>{tournament.name}</h3>
                <div className="tournament-details">
                  <div className="detail-item">
                    <span className="detail-label">🎮 Juego:</span>
                    <span>{tournament.game || "Por definir"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">👥 Jugadores:</span>
                    <span>{tournament.players}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">📅 Inicio:</span>
                    <span>{tournament.startDate}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">✅ Inscritos:</span>
                    <span>{tournament.participants}/{tournament.totalPlayers}</span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min((tournament.participants / tournament.totalPlayers) * 100, 100)}%` }}
                  ></div>
                </div>
                <Link to="/torneos" className="view-tournament-link">
                  Ver Torneo
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="info-section">
        <div className="info-card">
          <div className="info-icon">📊</div>
          <h3>Estadísticas Globales</h3>
          <div className="stats-numbers">
            <div className="stat">
              <span className="stat-value">1,234</span>
              <span className="stat-label">Torneos Creados</span>
            </div>
            <div className="stat">
              <span className="stat-value">45,678</span>
              <span className="stat-label">Participantes</span>
            </div>
            <div className="stat">
              <span className="stat-value">156</span>
              <span className="stat-label">Torneos Activos</span>
            </div>
          </div>
        </div>

        <div className="info-card">
          <div className="info-icon">🎮</div>
          <h3>¿Por qué crear torneos con nosotros?</h3>
          <ul className="benefits-list">
            <li>✓ Sistema de brackets automático</li>
            <li>✓ Gestión de participantes en tiempo real</li>
            <li>✓ Múltiples formatos de torneo</li>
            <li>✓ Estadísticas detalladas</li>
            <li>✓ Compatible con todos los juegos</li>
          </ul>
        </div>

        <div className="info-card">
          <div className="info-icon">💡</div>
          <h3>Tips para organizadores</h3>
          <ul className="tips-list">
            <li>📌 Define claramente las reglas del torneo</li>
            <li>📌 Establece fechas límite de inscripción</li>
            <li>📌 Comunica los horarios con anticipación</li>
            <li>📌 Prepara premios atractivos</li>
            <li>📌 Promociona tu torneo en redes sociales</li>
          </ul>
        </div>
      </section>

      <section className="manager-cta">
        <h2>¿Listo para organizar tu torneo?</h2>
        <p>
          Únete a nuestra comunidad de organizadores y comienza a crear experiencias
          competitivas increíbles para jugadores de todo el mundo.
        </p>
        <div className="cta-buttons">
          <Link to="/registro" className="cta-primary">Crear cuenta gratis</Link>
          <Link to="/torneos" className="cta-secondary">Explorar torneos</Link>
        </div>
      </section>
    </main>
  );
};

export default TournamentManager;