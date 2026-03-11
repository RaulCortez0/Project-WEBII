import { Link } from "react-router-dom";
import "./Home.css";
const Home = () => {
  const tournaments = [
    {
      name: "Smash Bros Ultimate",
      creator: "Bongsarip",
      type: "Eliminación Simple",
      players: 24,
      date: "Created 3/10/26"
    },
    {
      name: "Overwatch",
      creator: "elpsuty",
      type: "Eliminación Simple",
      players: 8,
      date: "Created 3/10/26"
    }
  ];

  return (
    <main className="home">

      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-left">
          <span className="hero-sub">
            CADA JUEGO. CADA MODO.
          </span>

          <h1>
            ADMINISTRA TUS PROPIOS TORNEOS
          </h1>

          <p>
            Millones de personas al rededor del mundo confían en BracketCore para crear sus torneos, 
            hostear sus eventos  y mantener sus comunidades competitivas organizadas, informadas y 
            jugando juntas. ¡Atrévete a vivir la experiencia BracketCore!
          </p>

          <div className="hero-buttons">
            <Link to="/registro" className="btn-primary">
              REGISTRARSE
            </Link>

            <button className="btn-secondary">
              PRUEBA NUESTRO GENERADOR DE TORNEOS
            </button>
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
        
        <h2 style={{ fontSize: 42, marginBottom: 20 }}>
          Administra tu próximo torneo con BracketCore
        </h2>

        <p className="join-description">
          Por al menos 15 años, BracketCore ha estado ofreciendo un plataforma 
          para toda una comunidad amante de la competencia.
          ¡Únete al resto de la comunidad y juega!
        </p>

        <div className="join-buttons">
          <button className="btn-primary">
            CREAR UN TORNEO
          </button>
          <button className="btn-secondary">
            BUSCAR TORNEO
          </button>
        </div>

        {/* TOURNAMENT CARDS */}
        <div className="tournaments-grid">
          {tournaments.map((tournament, index) => (
            <article className="tournament-card" key={index}>
              <div className="card-header">
                <div className="tournament-name">{tournament.name}</div>
                <div className="tournament-creator">{tournament.creator}</div>
              </div>
              
              <div className="card-body">
                <div className="tournament-type">
                  <span>Tipo:</span>
                  <span>{tournament.type}</span>
                </div>
                <div className="tournament-type">
                  <span>Jugadores:</span>
                  <span>{tournament.players}</span>
                </div>
                <div className="tournament-date">
                  {tournament.date}
                </div>
              </div>

              <div className="card-footer">
                <button>VER TORNEO</button>
              </div>
            </article>
          ))}
        </div>
      </section>

    </main>
  );
};

export default Home;