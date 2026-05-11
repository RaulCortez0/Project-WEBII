import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./EditTournament.css";

interface Game {
  id: number;
  nombre_juego: string;
}

interface TournamentForm {
  id: number;
  title: string;
  gameId: string;
  gameType: string;
  eliminationType: string;
  maxPlayers: string;
  startDate: string;
  endDate: string;
  description: string;
  rules: string;
  prize: string;
  status: string;
}

const API_URL = "http://localhost:3001";

const EditTournament = () => {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const [userTournaments, setUserTournaments] = useState<any[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [formData, setFormData] = useState<TournamentForm>({
    id: 0,
    title: "",
    gameId: "",
    gameType: "",
    eliminationType: "simple",
    maxPlayers: "16",
    startDate: "",
    endDate: "",
    description: "",
    rules: "",
    prize: "",
    status: "abierto"
  });
  const [errors, setErrors] = useState<Partial<TournamentForm>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cargar torneos del usuario y juegos
  useEffect(() => {
    if (isLoggedIn && user?.id) {
      fetchUserTournaments();
      fetchGames();
    }
  }, [isLoggedIn, user]);

  const fetchUserTournaments = async () => {
    try {
      const response = await fetch(`${API_URL}/torneos/usuario/${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setUserTournaments(data);
      }
    } catch (err) {
      console.error("Error al cargar torneos:", err);
    }
  };

  const fetchGames = async () => {
    try {
      const response = await fetch(`${API_URL}/videojuegos`);
      if (response.ok) {
        const data = await response.json();
        setGames(data);
      }
    } catch (err) {
      console.error("Error al cargar juegos:", err);
    }
  };

  const hasTournaments = userTournaments.length > 0;

  const gameTypes = [
    "MOBA", "FPS", "Battle Royale", "Deportes", "Lucha", "Estrategia", "Carreras", "Otro"
  ];

  const eliminationTypes = [
    { value: "simple", label: "Eliminación Simple" },
    { value: "double", label: "Doble Eliminación" },
    { value: "league", label: "Liga (Todos contra todos)" },
    { value: "group", label: "Fase de grupos + Eliminación" },
    { value: "swiss", label: "Sistema Suizo" }
  ];

  const playerLimits = ["4", "8", "16", "32", "64", "128", "256"];
  const statusOptions = ["abierto", "en curso", "finalizado"];

  // Cargar datos del torneo seleccionado
  const handleTournamentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedTournamentId(id);
    
    if (id) {
      const selectedTournament = userTournaments.find(t => t.id.toString() === id);
      if (selectedTournament) {
        setFormData({
          id: selectedTournament.id,
          title: selectedTournament.name,
          gameId: selectedTournament.gameId?.toString() || "",
          gameType: selectedTournament.gameType || "MOBA",
          eliminationType: selectedTournament.type === "Eliminación Simple" ? "simple" : 
                          selectedTournament.type === "Doble Eliminación" ? "double" : "league",
          maxPlayers: selectedTournament.players?.toString() || "16",
          startDate: selectedTournament.startDate ? selectedTournament.startDate.split('T')[0] : "",
          endDate: selectedTournament.endDate ? selectedTournament.endDate.split('T')[0] : "",
          description: selectedTournament.description || "",
          rules: selectedTournament.rules || "",
          prize: selectedTournament.prize || "",
          status: selectedTournament.status || "abierto"
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

    if (!formData.gameId) {
      newErrors.gameId = "Selecciona un juego";
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

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoggedIn || !user?.id) {
      alert("Debes iniciar sesión para editar un torneo");
      return;
    }

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/torneos/${formData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formData.title,
          juego_id: parseInt(formData.gameId),
          fecha_inicio: formData.startDate,
          fecha_fin: formData.endDate,
          max_participantes: parseInt(formData.maxPlayers),
          descripcion: formData.description,
          estado: formData.status,
          formato: eliminationTypes.find(t => t.value === formData.eliminationType)?.label || formData.eliminationType,
          premio: formData.prize,
          reglas: formData.rules,
          creado_por: user.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Error al actualizar el torneo");
        setLoading(false);
        return;
      }

      setShowSuccess(true);
      setTimeout(() => {
        navigate("/torneos");
      }, 2000);
    } catch (err) {
      alert("Error al conectar con el servidor");
    } finally {
      setLoading(false);
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
                  {userTournaments.map(tournament => (
                    <option key={tournament.id} value={tournament.id}>
                      {tournament.name} - {tournament.game}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
                    <label htmlFor="gameId">Juego *</label>
                    <select
                      id="gameId"
                      name="gameId"
                      value={formData.gameId}
                      onChange={handleChange}
                      className={errors.gameId ? "error" : ""}
                    >
                      <option value="">Selecciona un juego</option>
                      {games.map(game => (
                        <option key={game.id} value={game.id}>{game.nombre_juego}</option>
                      ))}
                    </select>
                    {errors.gameId && <span className="error-message">{errors.gameId}</span>}
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
                  <div className="form-group">
                    <label htmlFor="status">Estado del Torneo</label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>
                          {status === 'abierto' ? 'Abierto' : status === 'en curso' ? 'En curso' : 'Finalizado'}
                        </option>
                      ))}
                    </select>
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
                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? "GUARDANDO..." : "Guardar Cambios"}
                  </button>
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