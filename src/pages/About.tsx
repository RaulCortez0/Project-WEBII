import { Link } from "react-router-dom";
import "./About.css";

const About = () => {
  return (
    <main className="about-page">
      {/* Hero Section con imagen de fondo completa */}
      <section className="about-hero">
        <div className="about-hero-overlay"></div>
        <div className="about-hero-content">
          <h1>BRACKET CORE</h1>
          <p>
            La plataforma definitiva para gestionar torneos de esports 
            y competencias de videojuegos
          </p>
        </div>
      </section>

      {/* Misión y Visión */}
      <section className="mission-vision">
        <div className="mission-card">
          <div className="mission-icon">🎯</div>
          <h2>Misión</h2>
          <p>
            Democratizar la organización de torneos de esports, ofreciendo una 
            plataforma accesible, intuitiva y poderosa que permita a jugadores, 
            organizadores y comunidades de cualquier videojuego crear y gestionar 
            competencias profesionales de manera sencilla y eficiente.
          </p>
        </div>

        <div className="vision-card">
          <div className="vision-icon">👁️</div>
          <h2>Visión</h2>
          <p>
            Convertirnos en la plataforma líder mundial para la gestión de torneos 
            de esports, reconocida por nuestra innovación, confiabilidad y capacidad 
            para conectar a millones de jugadores alrededor del mundo, impulsando 
            el crecimiento de la industria gaming.
          </p>
        </div>
      </section>

      {/* Valores */}
      <section className="values-section">
        <h2>Nuestros Valores</h2>
        <div className="values-grid">
          <div className="value-card">
            <span className="value-icon">⚡</span>
            <h3>Innovación</h3>
            <p>Constantemente mejoramos nuestra plataforma con las últimas tecnologías</p>
          </div>
          <div className="value-card">
            <span className="value-icon">🤝</span>
            <h3>Comunidad</h3>
            <p>Ponemos a los jugadores y organizadores en el centro de todo</p>
          </div>
          <div className="value-card">
            <span className="value-icon">🚀</span>
            <h3>Excelencia</h3>
            <p>Buscamos la perfección en cada torneo y característica</p>
          </div>
          <div className="value-card">
            <span className="value-icon">🎮</span>
            <h3>Pasión por los esports</h3>
            <p>Amamos los videojuegos tanto como nuestra comunidad</p>
          </div>
        </div>
      </section>

      {/* Qué ofrecemos */}
      <section className="offer-section">
        <h2>¿Qué ofrecemos?</h2>
        <div className="offer-grid">
          <div className="offer-item">
            <div className="offer-icon">🏆</div>
            <h3>Crea Torneos</h3>
            <p>Organiza torneos para cualquier videojuego en minutos</p>
          </div>
          <div className="offer-item">
            <div className="offer-icon">📊</div>
            <h3>Gestión Automática</h3>
            <p>Brackets automáticos, calendarios y resultados en tiempo real</p>
          </div>
          <div className="offer-item">
            <div className="offer-icon">🎯</div>
            <h3>Múltiples Formatos</h3>
            <p>Eliminación simple, doble eliminación, ligas y más</p>
          </div>
          <div className="offer-item">
            <div className="offer-icon">👥</div>
            <h3>Gestión de Participantes</h3>
            <p>Inscripciones, check-in y comunicación integrada</p>
          </div>
          <div className="offer-item">
            <div className="offer-icon">📱</div>
            <h3>Responsive Design</h3>
            <p>Accede desde cualquier dispositivo</p>
          </div>
          <div className="offer-item">
            <div className="offer-icon">🔗</div>
            <h3>API Integrada</h3>
            <p>Conecta con otras plataformas y herramientas</p>
          </div>
        </div>
      </section>

      {/* Videojuegos soportados */}
      <section className="games-section">
        <h2>Compatible con todos los videojuegos</h2>
        <p className="games-subtitle">
          Desde los más populares hasta los títulos indie
        </p>
        <div className="games-grid">
          <div className="game-tag">League of Legends</div>
          <div className="game-tag">Valorant</div>
          <div className="game-tag">CS:GO / CS2</div>
          <div className="game-tag">Dota 2</div>
          <div className="game-tag">Fortnite</div>
          <div className="game-tag">Rocket League</div>
          <div className="game-tag">FIFA / EA FC</div>
          <div className="game-tag">Call of Duty</div>
          <div className="game-tag">Overwatch 2</div>
          <div className="game-tag">Apex Legends</div>
          <div className="game-tag">Smash Bros</div>
          <div className="game-tag">Street Fighter</div>
          <div className="game-tag">Rainbow Six</div>
          <div className="game-tag">Minecraft</div>
          <div className="game-tag">Clash Royale</div>
          <div className="game-tag">Y muchos más...</div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-cta">
        <h2>¿Listo para comenzar?</h2>
        <p>
          Únete a miles de organizadores que ya confían en Bracket Core 
          para gestionar sus torneos
        </p>
        <div className="about-cta-buttons">
          <Link to="/registro" className="cta-primary">Crear cuenta gratis</Link>
          <Link to="/torneos" className="cta-secondary">Explorar torneos</Link>
        </div>
      </section>
    </main>
  );
};

export default About;