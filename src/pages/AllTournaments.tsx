import { useState } from "react";
import { Link } from "react-router-dom";
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
  status: "open" | "closed" | "full";
  image?: string;
}

// Exportamos los torneos para usarlos en TournamentManager
export const tournamentsData: Tournament[] = [
  {
    id: 1,
    name: "League of Legends Championship",
    game: "League of Legends",
    type: "Eliminación Simple",
    players: 32,
    registeredPlayers: 32,
    startDate: "2026-04-15",
    endDate: "2026-04-20",
    status: "full"
  },
  {
    id: 2,
    name: "Valorant Masters",
    game: "Valorant",
    type: "Doble Eliminación",
    players: 16,
    registeredPlayers: 12,
    startDate: "2026-04-20",
    endDate: "2026-04-25",
    status: "open"
  },
  {
    id: 3,
    name: "CS2 Global Cup",
    game: "Counter-Strike 2",
    type: "Eliminación Simple",
    players: 64,
    registeredPlayers: 64,
    startDate: "2026-04-10",
    endDate: "2026-04-18",
    status: "full"
  },
  {
    id: 4,
    name: "FIFA World Tournament",
    game: "EA FC 25",
    type: "Liga",
    players: 128,
    registeredPlayers: 45,
    startDate: "2026-05-01",
    endDate: "2026-05-10",
    status: "open"
  },
  {
    id: 5,
    name: "Rocket League Cup",
    game: "Rocket League",
    type: "Doble Eliminación",
    players: 24,
    registeredPlayers: 18,
    startDate: "2026-04-25",
    endDate: "2026-04-30",
    status: "open"
  },
  {
    id: 6,
    name: "Dota 2 International",
    game: "Dota 2",
    type: "Eliminación Simple",
    players: 48,
    registeredPlayers: 48,
    startDate: "2026-04-05",
    endDate: "2026-04-12",
    status: "closed"
  },
  {
    id: 7,
    name: "Smash Bros Ultimate",
    game: "Super Smash Bros",
    type: "Eliminación Simple",
    players: 32,
    registeredPlayers: 20,
    startDate: "2026-05-05",
    endDate: "2026-05-08",
    status: "open"
  },
  {
    id: 8,
    name: "Overwatch 2 League",
    game: "Overwatch 2",
    type: "Liga",
    players: 20,
    registeredPlayers: 20,
    startDate: "2026-04-08",
    endDate: "2026-04-22",
    status: "full"
  }
];

const AllTournaments = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [searchGame, setSearchGame] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "oldest">("recent");

  // Filtrar torneos por juego
  const filteredTournaments = tournamentsData.filter(tournament =>
    tournament.game.toLowerCase().includes(searchGame.toLowerCase())
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
    } else if (isFull || tournament.status === "full") {
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

  return (
    <main className="all-tournaments">
      {/* Hero Section con imagen de fondo como en TournamentManager */}
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
          <h2>Torreos encontrados: {sortedTournaments.length}</h2>
        </div>

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
                      <span>{tournament.game}</span>
                    </div>
                    <div className="detail">
                      <span className="detail-icon">🏆</span>
                      <span>{tournament.type}</span>
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
                  </div>

                  <div className="progress-container">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${(tournament.registeredPlayers / tournament.players) * 100}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      {Math.round((tournament.registeredPlayers / tournament.players) * 100)}% completado
                    </span>
                  </div>

                  <div className="tournament-item-footer">
                    {statusInfo.available ? (
                      <Link to={`/torneo/${tournament.id}`} className="register-btn">
                        Inscribirse
                      </Link>
                    ) : (
                      <button className="register-btn disabled" disabled>
                        {statusInfo.message}
                      </button>
                    )}
                    <Link to={`/torneo/${tournament.id}/ver`} className="view-btn">
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