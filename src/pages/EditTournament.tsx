import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./EditTournament.css";

interface TournamentForm {
  id: number;
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

// Datos de torneos creados por el usuario (simulado)
// En una aplicación real, esto vendría de una API con el ID del usuario
const getUserTournaments = () => {
  // Simulamos que el usuario actual tiene ID 1
  const currentUserId = 1;
  
  // Torneos creados por el usuario (filtrados)
  const allTournaments = [
    {
      id: 1,
      name: "League of Legends Championship",
      game: "League of Legends",
      type: "Eliminación Simple",
      players: 32,
      startDate: "2026-04-15",
      endDate: "2026-04-20",
      description: "Torneo oficial de League of Legends",
      rules: "Reglas estándar",
      prize: "$500 USD",
      createdBy: 1
    },
    {
      id: 2,
      name: "Valorant Masters",
      game: "Valorant",
      type: "Doble Eliminación",
      players: 16,
      startDate: "2026-04-20",
      endDate: "2026-04-25",
      description: "Torneo de Valorant para la comunidad",
      rules: "Reglas competitivas",
      prize: "$300 USD",
      createdBy: 1
    },
    {
      id: 5,
      name: "Rocket League Cup",
      game: "Rocket League",
      type: "Doble Eliminación",
      players: 24,
      startDate: "2026-04-25",
      endDate: "2026-04-30",
      description: "Copa de Rocket League",
      rules: "Reglas estándar",
      prize: "$200 USD",
      createdBy: 2 // Este es de otro usuario, no se muestra
    }
  ];
  
  return allTournaments.filter(t => t.createdBy === currentUserId);
};

const EditTournament = () => {
  const navigate = useNavigate();
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [formData, setFormData] = useState<TournamentForm>({
    id: 0,
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

  // Obtener torneos del usuario actual
  const userTournaments = getUserTournaments();
  const hasTournaments = userTournaments.length > 0;

  // Lista de juegos disponibles
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

  // Tipos de juego
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

  // Tipos de eliminación
  const eliminationTypes = [
    { value: "simple", label: "Eliminación Simple" },
    { value: "double", label: "Doble Eliminación" },
    { value: "league", label: "Liga (Todos contra todos)" },
    { value: "group", label: "Fase de grupos + Eliminación" },
    { value: "swiss", label: "Sistema Suizo" }
  ];

  // Opciones de límite de jugadores
  const playerLimits = ["4", "8", "16", "32", "64", "128", "256"];

  // Convertir torneos del usuario al formato del formulario
  const tournamentOptions = userTournaments.map(t => ({
    id: t.id,
    name: t.name,
    game: t.game,
    gameType: t.type === "Eliminación Simple" ? "FPS" : t.type === "Doble Eliminación" ? "MOBA" : "Estrategia",
    eliminationType: t.type === "Eliminación Simple" ? "simple" : t.type === "Doble Eliminación" ? "double" : "league",
    maxPlayers: t.players.toString(),
    startDate: t.startDate,
    endDate: t.endDate,
    description: t.description,
    rules: t.rules,
    prize: t.prize
  }));

  // Cargar datos del torneo seleccionado
  const handleTournamentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedTournamentId(id);
    
    if (id) {
      const selectedTournament = tournamentOptions.find(t => t.id.toString() === id);
      if (selectedTournament) {
        setFormData({
          id: selectedTournament.id,
          title: selectedTournament.name,
          game: selectedTournament.game,
          gameType: selectedTournament.gameType,
          eliminationType: selectedTournament.eliminationType,
          maxPlayers: selectedTournament.maxPlayers,
          startDate: selectedTournament.startDate,
          endDate: selectedTournament.endDate,
          description: selectedTournament.description,
          rules: selectedTournament.rules,
          prize: selectedTournament.prize
        });
      }
    }
  };

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
      const tournamentToSend = {
        ...formData,
        maxPlayers: parseInt(formData.maxPlayers, 10)
      };
      console.log("Torneo actualizado:", tournamentToSend);
      setShowSuccess(true);
      setTimeout(() => {
        navigate("/torneos");
      }, 2000);
    }
  };

  return (
    <main className="edit-tournament">
      <section className="edit-hero">
        <div className="edit-hero-overlay"></div>
        <div className="edit-hero-content">
          <h1>EDITAR TORNEO</h1>
          <p>Selecciona un torneo que hayas creado y modifica sus datos</p>
        </div>
      </section>

      <section className="edit-form-section">
        <div className="form-container">
          {showSuccess && (
            <div className="success-message">
              <span className="success-icon">✅</span>
              <h3>¡Torneo actualizado exitosamente!</h3>
              <p>Serás redirigido a la lista de torneos...</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="tournament-form">
            <div className="form-row">
              <div className="form-group full-width selector-group">
                <label htmlFor="tournamentSelect">Seleccionar Torneo a Editar *</label>
                <select
                  id="tournamentSelect"
                  value={selectedTournamentId}
                  onChange={handleTournamentSelect}
                  className="tournament-select"
                  disabled={!hasTournaments}
                >
                  <option value="">-- Selecciona un torneo --</option>
                  {tournamentOptions.map(tournament => (
                    <option key={tournament.id} value={tournament.id}>
                      {tournament.name} - {tournament.game}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mensaje si no hay torneos */}
            {!hasTournaments && (
              <div className="no-tournaments-message">
                <span className="no-tournaments-icon">🏆</span>
                <h3>No tienes torneos creados</h3>
                <p>Para editar un torneo, primero debes crear uno.</p>
                <Link to="/crear-torneo" className="create-tournament-link">
                  Crear mi primer torneo
                </Link>
              </div>
            )}

            {/* Mostrar formulario solo si hay torneos y se seleccionó uno */}
            {hasTournaments && selectedTournamentId && (
              <>
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
                  <button type="submit" className="submit-btn">Guardar Cambios</button>
                </div>
              </>
            )}
          </form>
        </div>
      </section>

      <section className="edit-tips">
        <h2>Consejos para editar tu torneo</h2>
        <div className="tips-grid">
          <div className="tip-card">
            <span className="tip-icon">📝</span>
            <h3>Actualiza la información</h3>
            <p>Mantén los datos del torneo siempre actualizados</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon">⏰</span>
            <h3>Revisa las fechas</h3>
            <p>Asegúrate que las fechas sean correctas</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon">📢</span>
            <h3>Comunica los cambios</h3>
            <p>Notifica a los participantes sobre modificaciones</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon">🎯</span>
            <h3>Verifica los cupos</h3>
            <p>Controla el límite de participantes</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default EditTournament;