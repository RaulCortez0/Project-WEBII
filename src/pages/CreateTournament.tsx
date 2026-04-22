import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./CreateTournament.css";

interface TournamentForm {
  title: string;
  game: string;
  gameType: string;
  eliminationType: string;
  maxPlayers: string;
  startDate: string;
  endDate: string;
  description: string;
  rules: string;
  prize: string;
}

const CreateTournament = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<TournamentForm>({
    title: "",
    game: "",
    gameType: "",
    eliminationType: "simple",
    maxPlayers: "16",
    startDate: "",
    endDate: "",
    description: "",
    rules: "",
    prize: ""
  });

  const [errors, setErrors] = useState<Partial<TournamentForm>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const gamesList = [
    "League of Legends",
    "Valorant",
    "Counter-Strike 2",
    "Dota 2",
    "Fortnite",
    "Rocket League",
    "EA FC 25",
    "Call of Duty",
    "Overwatch 2",
    "Apex Legends",
    "Super Smash Bros",
    "Street Fighter 6",
    "Rainbow Six Siege",
    "Minecraft",
    "Clash Royale",
    "Otro"
  ];

  const gameTypes = [
    "MOBA",
    "FPS",
    "Battle Royale",
    "Deportes",
    "Lucha",
    "Estrategia",
    "Carreras",
    "Otro"
  ];

  const eliminationTypes = [
    { value: "simple", label: "Eliminación Simple" },
    { value: "double", label: "Doble Eliminación" },
    { value: "league", label: "Liga (Todos contra todos)" },
    { value: "group", label: "Fase de grupos + Eliminación" },
    { value: "swiss", label: "Sistema Suizo" }
  ];

  const playerLimits = ["4", "8", "16", "32", "64", "128", "256"];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name as keyof TournamentForm]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<TournamentForm> = {};
    let isValid = true;

    if (!formData.title.trim()) {
      newErrors.title = "El título del torneo es requerido";
      isValid = false;
    } else if (formData.title.length < 5) {
      newErrors.title = "El título debe tener al menos 5 caracteres";
      isValid = false;
    }

    if (!formData.game) {
      newErrors.game = "Selecciona un juego";
      isValid = false;
    }

    if (!formData.gameType) {
      newErrors.gameType = "Selecciona el tipo de juego";
      isValid = false;
    }

    if (!formData.startDate) {
      newErrors.startDate = "Selecciona la fecha de inicio";
      isValid = false;
    }

    if (!formData.endDate) {
      newErrors.endDate = "Selecciona la fecha de fin";
      isValid = false;
    }

    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.endDate = "La fecha de fin debe ser posterior a la fecha de inicio";
      isValid = false;
    }

    const maxPlayersNum = parseInt(formData.maxPlayers, 10);
    if (maxPlayersNum < 2) {
      newErrors.maxPlayers = "El mínimo de jugadores es 2";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Convertir maxPlayers a número para enviar a la API
      const tournamentToSend = {
        ...formData,
        maxPlayers: parseInt(formData.maxPlayers, 10)
      };
      console.log("Torneo creado:", tournamentToSend);
      setShowSuccess(true);
      setTimeout(() => {
        navigate("/torneos");
      }, 2000);
    }
  };

  return (
    <main className="create-tournament">
      <section className="create-hero">
        <div className="create-hero-overlay"></div>
        <div className="create-hero-content">
          <h1>CREAR NUEVO TORNEO</h1>
          <p>Completa el formulario para organizar tu propia competencia</p>
        </div>
      </section>

      <section className="create-form-section">
        <div className="form-container">
          {showSuccess && (
            <div className="success-message">
              <span className="success-icon">✅</span>
              <h3>¡Torneo creado exitosamente!</h3>
              <p>Serás redirigido a la lista de torneos...</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="tournament-form">
            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="title">Título del Torneo *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ej: Liga de Honor 2026"
                  className={errors.title ? "error" : ""}
                />
                {errors.title && <span className="error-message">{errors.title}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="game">Juego *</label>
                <select
                  id="game"
                  name="game"
                  value={formData.game}
                  onChange={handleChange}
                  className={errors.game ? "error" : ""}
                >
                  <option value="">Selecciona un juego</option>
                  {gamesList.map(game => (
                    <option key={game} value={game}>{game}</option>
                  ))}
                </select>
                {errors.game && <span className="error-message">{errors.game}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="gameType">Tipo de Juego *</label>
                <select
                  id="gameType"
                  name="gameType"
                  value={formData.gameType}
                  onChange={handleChange}
                  className={errors.gameType ? "error" : ""}
                >
                  <option value="">Selecciona un tipo</option>
                  {gameTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.gameType && <span className="error-message">{errors.gameType}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="eliminationType">Tipo de Eliminación</label>
                <select
                  id="eliminationType"
                  name="eliminationType"
                  value={formData.eliminationType}
                  onChange={handleChange}
                >
                  {eliminationTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="maxPlayers">Límite de Jugadores *</label>
                <select
                  id="maxPlayers"
                  name="maxPlayers"
                  value={formData.maxPlayers}
                  onChange={handleChange}
                  className={errors.maxPlayers ? "error" : ""}
                >
                  {playerLimits.map(limit => (
                    <option key={limit} value={limit}>{limit} jugadores</option>
                  ))}
                </select>
                {errors.maxPlayers && <span className="error-message">{errors.maxPlayers}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDate">Fecha de Inicio *</label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className={errors.startDate ? "error" : ""}
                />
                {errors.startDate && <span className="error-message">{errors.startDate}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="endDate">Fecha de Fin *</label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className={errors.endDate ? "error" : ""}
                />
                {errors.endDate && <span className="error-message">{errors.endDate}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="description">Descripción del Torneo</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Describe tu torneo, formato, horarios, etc."
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="rules">Reglas del Torneo</label>
                <textarea
                  id="rules"
                  name="rules"
                  value={formData.rules}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Especifica las reglas, restricciones, mapa inicial, etc."
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="prize">Premio (Opcional)</label>
                <input
                  type="text"
                  id="prize"
                  name="prize"
                  value={formData.prize}
                  onChange={handleChange}
                  placeholder="Ej: $500 USD + Trofeo + Skin exclusiva"
                />
              </div>
            </div>

            <div className="form-actions">
              <Link to="/torneos" className="cancel-btn">Cancelar</Link>
              <button type="submit" className="submit-btn">Crear Torneo</button>
            </div>
          </form>
        </div>
      </section>

      <section className="create-tips">
        <h2>Consejos para un torneo exitoso</h2>
        <div className="tips-grid">
          <div className="tip-card">
            <span className="tip-icon">📢</span>
            <h3>Promociona tu torneo</h3>
            <p>Comparte el torneo en redes sociales y comunidades de gamers</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon">⏰</span>
            <h3>Define horarios claros</h3>
            <p>Establece horarios fijos y comunícalos con anticipación</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon">📋</span>
            <h3>Reglas detalladas</h3>
            <p>Especifica todas las reglas para evitar confusiones</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon">🎁</span>
            <h3>Premios atractivos</h3>
            <p>Ofrece premios que motiven a los participantes</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default CreateTournament;