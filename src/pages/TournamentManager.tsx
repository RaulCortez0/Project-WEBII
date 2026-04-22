import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { tournamentsData } from "./AllTournaments";
import "./TournamentManager.css";

const TournamentManager = () => {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showLoginWarning, setShowLoginWarning] = useState(false);

  // Estado simulado de sesión (cambiar a true si el usuario está logueado)
  const [isLoggedIn] = useState(true);

  // Función para obtener el estado del torneo igual que en AllTournaments
  const getTournamentStatus = (tournament: typeof tournamentsData[0]) => {
    const currentDate = new Date();
    const endDate = new Date(tournament.endDate);
    const isDateExpired = currentDate > endDate;
    const isFull = tournament.registeredPlayers >= tournament.players;

    if (isDateExpired) {
      return "Torneo finalizado";
    } else if (isFull || tournament.status === "full") {
      return "Torneo cerrado - Cupo lleno";
    } else {
      const availableSpots = tournament.players - tournament.registeredPlayers;
      return `Disponible - ${availableSpots} cupos`;
    }
  };

  // Obtener los 3 torneos más recientes por fecha de inicio
  const getRecentTournaments = () => {
    return [...tournamentsData]
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .slice(0, 3)
      .map(tournament => ({
        id: tournament.id,
        name: tournament.name,
        game: tournament.game,
        players: tournament.players,
        startDate: new Date(tournament.startDate).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        }),
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
      setShowLoginWarning(false);
      setSelectedOption("create");
      navigate("/crear-torneo");
    }
  };

  const handleEditTournament = () => {
    if (!isLoggedIn) {
      setShowLoginWarning(true);
      setSelectedOption("edit");
    } else {
      setShowLoginWarning(false);
      setSelectedOption("edit");
      navigate("/editar-torneo");
    }
  };

  const handleCloseWarning = () => {
    setShowLoginWarning(false);
    setSelectedOption(null);
  };

  // Función para obtener la clase del estado
  const getStatusClass = (status: string) => {
    if (status.includes("Disponible")) return "status-available";
    if (status.includes("cerrado") || status.includes("Cupo lleno")) return "status-full";
    if (status.includes("finalizado")) return "status-closed";
    return "status-available";
  };

  return (
    <main className="tournament-manager">
      {/* Hero Section con imagen de fondo */}
      <section className="manager-hero">
        <div className="manager-hero-overlay"></div>
        <div className="manager-hero-content">
          <h1>GESTIÓN DE TORNEOS</h1>
          <p>Crea, edita y administra tus competencias desde un solo lugar</p>
        </div>
      </section>

      {/* Selector de acciones */}
      <section className="action-selector">
        <h2>¿Qué deseas hacer?</h2>
        <div className="action-buttons">
          <button 
            className={`action-btn create-btn ${selectedOption === "create" && showLoginWarning ? 'warning' : ''}`}
            onClick={handleCreateTournament}
          >
            <span className="btn-icon">🏆</span>
            Crear Torneo
          </button>
          <button 
            className={`action-btn edit-btn ${selectedOption === "edit" && showLoginWarning ? 'warning' : ''}`}
            onClick={handleEditTournament}
          >
            <span className="btn-icon">✏️</span>
            Editar Torneo
          </button>
        </div>

        {/* Advertencia de inicio de sesión */}
        {showLoginWarning && (
          <div className="login-warning">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <h3>Necesitas una cuenta</h3>
              <p>
                Para {selectedOption === "create" ? "crear un nuevo torneo " : "editar un torneo existente "} 
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

      {/* Torneos Activos - 3 más recientes */}
      <section className="active-tournaments">
        <div className="section-header">
          <h2>🏆 Torneos Recientes</h2>
          <Link to="/torneos" className="view-all-link">Ver todos →</Link>
        </div>
        
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
                  <span>{tournament.game}</span>
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
                  style={{ width: `${(tournament.participants / tournament.totalPlayers) * 100}%` }}
                ></div>
              </div>
              <Link to="/torneos" className="view-tournament-link">
                Ver Torneo
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Sección de información adicional */}
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

      {/* CTA Final */}
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