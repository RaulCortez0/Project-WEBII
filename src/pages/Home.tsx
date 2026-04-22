import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Home.css";

const API_URL = "http://localhost:3001";

const Home = () => {
  const [recentTournaments, setRecentTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentTournaments();
  }, []);

  const fetchRecentTournaments = async () => {
    try {
      const response = await fetch(`${API_URL}/torneos`);
      if (response.ok) {
        const data = await response.json();
        // Tomar los 3 más recientes
        const sorted = data
          .sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
          .slice(0, 3)
          .map((t: any) => ({
            id: t.id,
            name: t.name,
            game: t.game,
            type: t.type,
            players: t.players,
            registeredPlayers: t.registeredPlayers,
            startDate: t.startDate ? new Date(t.startDate).toLocaleDateString("es-ES", {
              day: "2-digit", month: "2-digit", year: "numeric"
            }) : "Por definir",
            status: getTournamentStatus(t)
          }));
        setRecentTournaments(sorted);
      }
    } catch (err) {
      console.error("Error cargando torneos:", err);
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
    if (isFull || tournament.status === "full") return "Torneo cerrado - Cupo lleno";
    const availableSpots = tournament.players - tournament.registeredPlayers;
    return `Disponible - ${availableSpots} cupos`;
  };

  const getStatusClass = (status: string) => {
    if (status.includes("Disponible")) return "status-available";
    if (status.includes("cerrado") || status.includes("Cupo lleno")) return "status-full";
    if (status.includes("finalizado")) return "status-closed";
    return "status-available";
  };

  return (
    <main className="home">
      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-left">
          <span className="hero-sub">CADA JUEGO. CADA MODO.</span>
          <h1>ADMINISTRA TUS PROPIOS TORNEOS</h1>
          <p>
            Millones de personas al rededor del mundo confían en BracketCore para crear sus torneos, 
            hostear sus eventos y mantener sus comunidades competitivas organizadas, informadas y 
            jugando juntas. ¡Atrévete a vivir la experiencia BracketCore!
          </p>
          <div className="hero-buttons">
            <Link to="/registro" className="btn-primary">REGISTRARSE</Link>
            <Link to="/gestion-torneos" className="btn-secondary">PRUEBA NUESTRO GENERADOR DE TORNEOS</Link>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">15+</div>
              <div className="stat-label">Años de experiencia</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">1M+</div>
              <div className="stat-label">Torneos creados</div>
            </div>
          </div>
        </div>
      </section>

      {/* JOIN SECTION */}
      <section className="join-section">
        <h2>ÚNETE A LAS MASAS</h2>
        <h2 style={{ fontSize: 42, marginBottom: 20 }}>Administra tu próximo torneo con BracketCore</h2>
        <p className="join-description">
          Por al menos 15 años, BracketCore ha estado ofreciendo un plataforma 
          para toda una comunidad amante de la competencia.
          ¡Únete al resto de la comunidad y juega!
        </p>
        <div className="join-buttons">
          <Link to="/gestion-torneos" className="btn-primary">CREAR UN TORNEO</Link>
          <Link to="/torneos" className="btn-secondary">BUSCAR TORNEO</Link>
        </div>

        {/* TORNEOS RECIENTES */}
        <div className="home-tournaments-section">
          <div className="home-section-header">
            <h3>🏆 Torneos Recientes</h3>
            <Link to="/torneos" className="view-all-link">Ver todos →</Link>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#b0b0c0" }}>
              <p>Cargando torneos...</p>
            </div>
          ) : (
            <div className="home-tournaments-grid">
              {recentTournaments.map((tournament) => (
                <div className={`home-tournament-card ${getStatusClass(tournament.status)}`} key={tournament.id}>
                  <div className={`home-tournament-status ${getStatusClass(tournament.status)}`}>
                    {tournament.status}
                  </div>
                  <h4>{tournament.name}</h4>
                  <div className="home-tournament-details">
                    <div className="home-detail-item">
                      <span className="home-detail-label">🎮 Juego:</span>
                      <span>{tournament.game}</span>
                    </div>
                    <div className="home-detail-item">
                      <span className="home-detail-label">🏆 Tipo:</span>
                      <span>{tournament.type}</span>
                    </div>
                    <div className="home-detail-item">
                      <span className="home-detail-label">👥 Jugadores:</span>
                      <span>{tournament.registeredPlayers}/{tournament.players}</span>
                    </div>
                    <div className="home-detail-item">
                      <span className="home-detail-label">📅 Inicio:</span>
                      <span>{tournament.startDate}</span>
                    </div>
                  </div>
                  <div className="home-progress-bar">
                    <div 
                      className="home-progress-fill" 
                      style={{ width: `${(tournament.registeredPlayers / tournament.players) * 100}%` }}
                    ></div>
                  </div>
                  <Link to={`/torneo/${tournament.id}`} className="home-view-tournament-link">
                    Ver Torneo
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default Home;