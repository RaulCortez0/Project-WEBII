import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./TournamentBracket.css";

const API_URL = "http://localhost:3001";

interface Match {
  id: number;
  torneo_id: number;
  ronda: number;
  bracket_pos: number;
  estado: "esperando" | "pendiente" | "en_disputa" | "confirmado";
  es_bye: number;
  jugador1_id: number | null;
  jugador1_nombre: string | null;
  jugador1_avatar: string | null;
  jugador2_id: number | null;
  jugador2_nombre: string | null;
  jugador2_avatar: string | null;
  ganador_id: number | null;
  ganador_nombre: string | null;
  reporte_j1: number | null;
  reporte_j2: number | null;
}

interface TorneoInfo {
  id: number;
  nombre: string;
  creado_por: number;
  bracket_iniciado: number;
  max_participantes: number;
}

const roundNames = (total: number, ronda: number): string => {
  const fromEnd = total - ronda;
  if (fromEnd === 0) return "🏆 Final";
  if (fromEnd === 1) return "Semifinal";
  if (fromEnd === 2) return "Cuartos de Final";
  return `Ronda ${ronda}`;
};

const TournamentBracket = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [torneo, setTorneo] = useState<TorneoInfo | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [decidingMatch, setDecidingMatch] = useState<Match | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchBracket = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/torneos/${id}/bracket`);
      if (!r.ok) throw new Error();
      const data = await r.json();
      setTorneo(data.torneo);
      setMatches(data.matches);
    } catch {
      showToast("Error al cargar el bracket", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBracket(); }, [id]);

  const handleGenerate = async () => {
    if (!isLoggedIn) return;
    setGenerating(true);
    try {
      const r = await fetch(`${API_URL}/torneos/${id}/bracket/generar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creado_por: user?.id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      showToast(`✅ Bracket generado: ${data.players} jugadores, ${data.totalRounds} rondas`);
      fetchBracket();
    } catch (err: any) {
      showToast(err.message ?? "Error al generar", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleReport = async (match: Match, ganador_id: number) => {
    try {
      const r = await fetch(`${API_URL}/partidas/${match.id}/reportar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: user?.id, ganador_id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      showToast(data.message);
      fetchBracket();
    } catch (err: any) {
      showToast(err.message ?? "Error al reportar", "error");
    }
  };

  const handleDecide = async (match: Match, ganador_id: number) => {
    try {
      const r = await fetch(`${API_URL}/partidas/${match.id}/decidir`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ganador_id, decidido_por: user?.id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      showToast("Ganador asignado correctamente");
      setDecidingMatch(null);
      fetchBracket();
    } catch (err: any) {
      showToast(err.message ?? "Error al decidir", "error");
    }
  };

  // Organizar matches por ronda
  const rounds = matches.reduce<Record<number, Match[]>>((acc, m) => {
    (acc[m.ronda] = acc[m.ronda] || []).push(m);
    return acc;
  }, {});
  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);
  const totalRounds = roundNumbers.length;

  // Detectar campeón: único match de la ronda final confirmado
  const finalRound = roundNumbers[roundNumbers.length - 1];
  const finalMatches = rounds[finalRound] || [];
  const champion = finalMatches.length === 1 && finalMatches[0].estado === "confirmado"
    ? { nombre: finalMatches[0].ganador_nombre, id: finalMatches[0].ganador_id }
    : null;

  const isOrganizer = user?.id === torneo?.creado_por;
  const isAdmin = user?.role === "admin";
  const canGenerate = isLoggedIn && (isOrganizer || isAdmin) && !torneo?.bracket_iniciado;

  const myId = user?.id;

  const renderPlayer = (match: Match, slot: 1 | 2) => {
    const playerId = slot === 1 ? match.jugador1_id : match.jugador2_id;
    const playerName = slot === 1 ? match.jugador1_nombre : match.jugador2_nombre;
    const isWinner = match.ganador_id === playerId;
    const isLoser = match.ganador_id !== null && match.ganador_id !== playerId;
    const myReport = slot === 1 ? match.reporte_j1 : match.reporte_j2;
    const isMe = playerId === myId;

    if (!playerId && match.es_bye) {
      return <div className="bp-player bp-bye"><span>BYE</span></div>;
    }
    if (!playerId) {
      return <div className="bp-player bp-tbd"><span>Por definir</span></div>;
    }

    return (
      <div className={`bp-player ${isWinner ? "bp-winner" : ""} ${isLoser ? "bp-loser" : ""} ${isMe ? "bp-me" : ""}`}>
        <div className="bp-avatar">
          {playerName?.[0]?.toUpperCase() ?? "?"}
        </div>
        <span className="bp-name">{playerName}</span>
        {isWinner && <span className="bp-crown">👑</span>}
        {myReport === playerId && !isWinner && <span className="bp-reported" title="Tu reporte">✔</span>}
      </div>
    );
  };

  const renderActions = (match: Match) => {
    if (match.estado === "confirmado" || match.es_bye || match.estado === "esperando") return null;
    if (!match.jugador1_id || !match.jugador2_id) return null;

    const amJ1 = myId === match.jugador1_id;
    const amJ2 = myId === match.jugador2_id;
    const amPlayer = amJ1 || amJ2;
    const myReported = amJ1 ? match.reporte_j1 : match.reporte_j2;

    return (
      <div className="bp-actions">
        {/* Jugadores reportan ganador */}
        {amPlayer && !myReported && (
          <div className="bp-report-section">
            <p className="bp-report-label">¿Quién ganó?</p>
            <div className="bp-report-btns">
              <button
                className="bp-btn-report"
                onClick={() => handleReport(match, match.jugador1_id!)}
              >
                {match.jugador1_nombre}
              </button>
              <button
                className="bp-btn-report"
                onClick={() => handleReport(match, match.jugador2_id!)}
              >
                {match.jugador2_nombre}
              </button>
            </div>
          </div>
        )}
        {amPlayer && myReported && (
          <p className="bp-report-pending">
            ⏳ Reporte enviado. Esperando al otro jugador...
          </p>
        )}
        {/* Organizador / Admin decide */}
        {(isOrganizer || isAdmin) && (
          <button
            className="bp-btn-decide"
            onClick={() => setDecidingMatch(match)}
          >
            ⚖️ {isAdmin ? "Decidir (Admin)" : "Decidir ganador"}
          </button>
        )}
        {/* Disputa entre reportes */}
        {match.estado === "en_disputa" && match.reporte_j1 && match.reporte_j2 && match.reporte_j1 !== match.reporte_j2 && (
          <p className="bp-dispute">⚠️ Reportes en conflicto — requiere decisión del organizador</p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <main className="bracket-page">
        <div className="bracket-loading">
          <div className="bracket-spinner" />
          <p>Cargando bracket...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="bracket-page">
      {toast && (
        <div className={`bracket-toast ${toast.type}`}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <section className="bracket-hero">
        <div className="bracket-hero-overlay" />
        <div className="bracket-hero-content">
          <button className="bracket-back" onClick={() => navigate(`/torneo/${id}`)}>
            ← Volver al torneo
          </button>
          <h1>🏆 {torneo?.nombre}</h1>
          <p>Sistema de Bracket — Eliminación Simple</p>
          {canGenerate && (
            <button
              className="bracket-generate-btn"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? "Generando..." : "⚡ Generar Bracket"}
            </button>
          )}
        </div>
      </section>

      {/* Banner campeón */}
      {champion && (
        <div className="champion-banner">
          <div className="champion-trophy">🏆</div>
          <div className="champion-info">
            <p className="champion-label">CAMPEÓN DEL TORNEO</p>
            <h2 className="champion-name">{champion.nombre}</h2>
          </div>
          <div className="champion-trophy">🏆</div>
        </div>
      )}

      {/* No bracket yet */}
      {!torneo?.bracket_iniciado && (
        <div className="bracket-empty">
          <div className="bracket-empty-icon">🎯</div>
          <h2>El bracket aún no ha sido iniciado</h2>
          <p>
            {canGenerate
              ? "Haz clic en \"Generar Bracket\" para iniciar el torneo con los jugadores inscritos."
              : "El organizador del torneo debe iniciar el bracket."}
          </p>
        </div>
      )}

      {/* Bracket visual */}
      {torneo?.bracket_iniciado && matches.length > 0 && (
        <div className="bracket-container">
          <div className="bracket-rounds">
            {roundNumbers.map(ronda => (
              <div key={ronda} className="bracket-round">
                <div className="bracket-round-label">
                  {roundNames(totalRounds, ronda)}
                </div>
                <div className="bracket-matches">
                  {(rounds[ronda] || []).map(match => (
                    <div
                      key={match.id}
                      className={`bracket-match ${match.estado === "confirmado" ? "match-done" : ""} ${match.es_bye ? "match-bye" : ""}`}
                    >
                      {match.es_bye && <div className="bye-label">BYE</div>}
                      <div className="match-players">
                        {renderPlayer(match, 1)}
                        <div className="vs-divider">VS</div>
                        {renderPlayer(match, 2)}
                      </div>
                      {match.estado !== "confirmado" && !match.es_bye && (
                        <div className={`match-status-chip estado-${match.estado}`}>
                          {match.estado === "pendiente" ? "Pendiente" :
                           match.estado === "en_disputa" ? "En disputa" :
                           match.estado === "esperando" ? "Esperando..." : match.estado}
                        </div>
                      )}
                      {match.estado === "confirmado" && match.ganador_nombre && (
                        <div className="match-winner-chip">
                          👑 Ganador: {match.ganador_nombre}
                        </div>
                      )}
                      {renderActions(match)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Decidir ganador (organizer/admin) */}
      {decidingMatch && (
        <div className="modal-overlay" onClick={() => setDecidingMatch(null)}>
          <div className="decide-modal" onClick={e => e.stopPropagation()}>
            <h2>⚖️ Decidir Ganador</h2>
            <p>Selecciona al jugador ganador de esta partida:</p>
            <div className="decide-options">
              {decidingMatch.jugador1_id && (
                <button
                  className="decide-btn"
                  onClick={() => handleDecide(decidingMatch, decidingMatch.jugador1_id!)}
                >
                  <div className="decide-avatar">{decidingMatch.jugador1_nombre?.[0]?.toUpperCase()}</div>
                  {decidingMatch.jugador1_nombre}
                </button>
              )}
              {decidingMatch.jugador2_id && (
                <button
                  className="decide-btn"
                  onClick={() => handleDecide(decidingMatch, decidingMatch.jugador2_id!)}
                >
                  <div className="decide-avatar">{decidingMatch.jugador2_nombre?.[0]?.toUpperCase()}</div>
                  {decidingMatch.jugador2_nombre}
                </button>
              )}
            </div>
            <button className="decide-cancel" onClick={() => setDecidingMatch(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </main>
  );
};

export default TournamentBracket;
