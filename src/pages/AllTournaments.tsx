import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AllTournaments.css";

export interface Tournament {
  id: number;
  name: string;
  game: string;
  type: string;
  players: number;
  registeredPlayers: number;
  startDate: string;
  endDate: string;
  status: string;
  description?: string;
  prize?: string;
  rules?: string;
  createdBy?: number;
}

const API_URL = "http://localhost:3001";

const AllTournaments = () => {
  const { user, isLoggedIn } = useAuth();
  const [showFilters, setShowFilters] = useState(false);
  const [searchGame, setSearchGame] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest">("recent");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cargar torneos desde la API
  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const response = await fetch(`${API_URL}/torneos`);
      if (!response.ok) throw new Error("Error al cargar torneos");
      const data = await response.json();
      setTournaments(data);
    } catch (err) {
      setError("No se pudieron cargar los torneos");
    } finally {
      setLoading(false);
    }
  };

  // Inscribirse a un torneo
  const handleRegister = async (tournamentId: number) => {
    if (!isLoggedIn) {
      alert("Debes iniciar sesión para inscribirte");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/inscripciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: user?.id,
          torneo_id: tournamentId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Error al inscribirse");
        return;
      }

      alert("¡Inscripción exitosa!");
      fetchTournaments(); // Recargar para actualizar contadores
    } catch (err) {
      alert("Error al conectar con el servidor");
    }
  };

  // Filtrar torneos por juego
  const filteredTournaments = tournaments.filter(tournament =>
    tournament.game?.toLowerCase().includes(searchGame.toLowerCase())
  );

  // Ordenar torneos por fecha
  const sortedTournaments = [...filteredTournaments].sort((a, b) => {
    if (sortOrder === "recent") {
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    } else {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    }
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return "Fecha por definir";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const getStatusInfo = (tournament: Tournament) => {
    const currentDate = new Date();
    const endDate = new Date(tournament.endDate);
    const isDateExpired = currentDate > endDate;
    const isFull = tournament.registeredPlayers >= tournament.players;

    if (isDateExpired) {
      return {
        message: "Torneo finalizado",
        className: "status-closed",
        available: false
      };
    } else if (isFull) {
      return {
        message: "Torneo cerrado - Cupo lleno",
        className: "status-full",
        available: false
      };
    } else {
      const availableSpots = tournament.players - tournament.registeredPlayers;
      return {
        message: `Disponible - ${availableSpots} cupos`,
        className: "status-available",
        available: true
      };
    }
  };

  if (loading) {
    return (
      <main className="all-tournaments">
        <div className="loading-container" style={{ textAlign: "center", padding: "100px", color: "white" }}>
          <div className="loading-spinner" style={{ fontSize: 48, marginBottom: 20 }}>⏳</div>
          <p>Cargando torneos...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="all-tournaments">
      {/* Hero Section */}
      <section className="tournaments-hero">
        <div className="tournaments-hero-overlay"></div>
        <div className="tournaments-hero-content">
          <h1>TODOS LOS TORNEOS</h1>
          <p>Explora, participa y compite en los mejores torneos de la comunidad</p>
        </div>
      </section>

      {/* Botón flotante de filtros */}
      <button 
        className="floating-filter-btn"
        onClick={() => setShowFilters(!showFilters)}
      >
        <span className="filter-icon">🔍</span>
        <span>Filtros</span>
      </button>

      {/* Panel de filtros flotante */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-header">
            <h3>Filtrar Torneos</h3>
            <button className="close-filters" onClick={() => setShowFilters(false)}>✕</button>
          </div>
          
          <div className="filter-group">
            <label>Buscar por juego</label>
            <input
              type="text"
              placeholder="Ej: League of Legends, Valorant..."
              value={searchGame}
              onChange={(e) => setSearchGame(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-group">
            <label>Ordenar por fecha</label>
            <div className="sort-buttons">
              <button 
                className={`sort-btn ${sortOrder === "recent" ? "active" : ""}`}
                onClick={() => setSortOrder("recent")}
              >
                Más recientes
              </button>
              <button 
                className={`sort-btn ${sortOrder === "oldest" ? "active" : ""}`}
                onClick={() => setSortOrder("oldest")}
              >
                Más antiguos
              </button>
            </div>
          </div>

          <button 
            className="clear-filters"
            onClick={() => {
              setSearchGame("");
              setSortOrder("recent");
            }}
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Resultados */}
      <section className="tournaments-results">
        <div className="results-header">
          <h2>Torneos encontrados: {sortedTournaments.length}</h2>
        </div>

        {error && (
          <div className="error-banner" style={{ 
            background: "rgba(255, 107, 107, 0.1)", 
            border: "1px solid #ff6b6b", 
            padding: "20px", 
            borderRadius: "10px", 
            marginBottom: "20px",
            color: "#ff6b6b"
          }}>
            ⚠️ {error}
          </div>
        )}

        <div className="tournaments-list">
          {sortedTournaments.length > 0 ? (
            sortedTournaments.map((tournament) => {
              const statusInfo = getStatusInfo(tournament);
              return (
                <div className={`tournament-item ${statusInfo.className}`} key={tournament.id}>
                  <div className="tournament-item-header">
                    <h3>{tournament.name}</h3>
                    <span className={`status-badge ${statusInfo.className}`}>
                      {statusInfo.message}
                    </span>
                  </div>
                  
                  <div className="tournament-item-details">
                    <div className="detail">
                      <span className="detail-icon">🎮</span>
                      <span>{tournament.game || "Juego por definir"}</span>
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

                  <div className="tournament-item-footer">
                    {statusInfo.available ? (
                      <button 
                        className="register-btn"
                        onClick={() => handleRegister(tournament.id)}
                      >
                        Inscribirse
                      </button>
                    ) : (
                      <button className="register-btn disabled" disabled>
                        {statusInfo.message}
                      </button>
                    )}
                    <Link to={`/torneo/${tournament.id}`} className="view-btn">
                      Ver detalles
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-results">
              <span className="no-results-icon">🔍</span>
              <h3>No se encontraron torneos</h3>
              <p>Intenta con otros filtros o palabras clave</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="tournaments-cta">
        <h2>¿No encuentras lo que buscas?</h2>
        <p>Crea tu propio torneo y comienza a competir</p>
        <Link to="/gestion-torneos" className="cta-primary">
          Crear Torneo
        </Link>
      </section>
    </main>
  );
};

export default AllTournaments;