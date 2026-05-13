import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
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
  estado: string;
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
  const [decidingMatch, setDecidingMatch] = useState<Match | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const fetchBracket = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/torneos/${id}/bracket`);
      if (!r.ok) throw new Error();
      const data = await r.json();
      setTorneo(data.torneo);
      setMatches(data.matches);
    } catch {
      toast.error("Error al cargar el bracket");
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
      toast.success(`✅ Bracket generado: ${data.players} jugadores, ${data.totalRounds} rondas`);
      fetchBracket();
    } catch (err: any) {
      toast.error(err.message ?? "Error al generar");
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = async () => {
    setShowResetConfirm(false);
    setGenerating(true);
    try {
      const r = await fetch(`${API_URL}/torneos/${id}/bracket/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: user?.id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      toast.success(`🔄 Bracket reiniciado: ${data.players} jugadores, ${data.totalRounds} rondas`);
      fetchBracket();
    } catch (err: any) {
      toast.error(err.message ?? "Error al reiniciar bracket");
    } finally {
      setGenerating(false);
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
      toast.success("Ganador asignado correctamente");
      setDecidingMatch(null);
      fetchBracket();
    } catch (err: any) {
      toast.error(err.message ?? "Error al decidir");
    }
  };

  const handleFinalizarTorneo = async () => {
    setShowFinalizeConfirm(false);
    setFinalizing(true);
    try {
      const r = await fetch(`${API_URL}/torneos/${id}/finalizar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: user?.id, role: user?.role }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      if (data.champion?.ganador_nombre) {
        toast.success(`🏆 Torneo finalizado! Campeón: ${data.champion.ganador_nombre}`);
      } else {
        toast.success("🏁 Torneo finalizado exitosamente");
      }
      fetchBracket();
    } catch (err: any) {
      toast.error(err.message ?? "Error al finalizar el torneo");
    } finally {
      setFinalizing(false);
    }
  };

  // Organizar matches por ronda
  const rounds = matches.reduce<Record<number, Match[]>>((acc, m) => {
    (acc[m.ronda] = acc[m.ronda] || []).push(m);
    return acc;
  }, {});
  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);
  const totalRounds = roundNumbers.length;

  // Detectar campeón: único match de la ronda final confirmado con ganador
  const finalRound = roundNumbers[roundNumbers.length - 1];
  const finalMatches = rounds[finalRound] || [];
  const champion =
    finalMatches.length === 1 && finalMatches[0].estado === "confirmado" && finalMatches[0].ganador_id
      ? { nombre: finalMatches[0].ganador_nombre, id: finalMatches[0].ganador_id }
      : null;

  const isOrganizer = user?.id === torneo?.creado_por;
  const isAdmin = user?.role === "admin";
  const canDecide = isLoggedIn && (isOrganizer || isAdmin);
  const canGenerate = canDecide && !torneo?.bracket_iniciado;

  const renderPlayer = (match: Match, slot: 1 | 2) => {
    const playerId = slot === 1 ? match.jugador1_id : match.jugador2_id;
    const playerName = slot === 1 ? match.jugador1_nombre : match.jugador2_nombre;
    const isWinner = match.ganador_id === playerId;
    const isLoser = match.ganador_id !== null && match.ganador_id !== playerId;
    const isMe = playerId === user?.id;

    if (!playerId && match.es_bye) return <div className="bp-player bp-bye"><span>BYE</span></div>;
    if (!playerId) return <div className="bp-player bp-tbd"><span>Por definir</span></div>;

    return (
      <div className={`bp-player ${isWinner ? "bp-winner" : ""} ${isLoser ? "bp-loser" : ""} ${isMe ? "bp-me" : ""}`}>
        <div className="bp-avatar">{playerName?.[0]?.toUpperCase() ?? "?"}</div>
        <span className="bp-name">{playerName}</span>
        {isWinner && <span className="bp-crown">👑</span>}
      </div>
    );
  };

  const renderActions = (match: Match) => {
    // Only admins/organizers can decide; no player self-report
    if (match.estado === "confirmado" || match.es_bye || match.estado === "esperando") return null;
    if (!match.jugador1_id || !match.jugador2_id) return null;
    if (!canDecide) return (
      <p className="bp-report-pending">⏳ Esperando decisión del administrador...</p>
    );

    return (
      <div className="bp-actions">
        {match.estado === "en_disputa" && (
          <p className="bp-dispute">⚠️ Resultado en disputa</p>
        )}
        <button className="bp-btn-decide" onClick={() => setDecidingMatch(match)}>
          ⚖️ {isAdmin ? "Decidir (Admin)" : "Decidir ganador"}
        </button>
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
            <button className="bracket-generate-btn" onClick={handleGenerate} disabled={generating}>
              {generating ? "Generando..." : "⚡ Generar Bracket"}
            </button>
          )}
          {canDecide && torneo?.bracket_iniciado === 1 && torneo?.estado !== "finalizado" && (
            <button
              className="bracket-generate-btn"
              style={{ background: "linear-gradient(135deg, #b45309, #92400e)", marginTop: "10px" }}
              onClick={() => setShowResetConfirm(true)}
              disabled={generating}
            >
              {generating ? "Procesando..." : "🔄 Rehacer Bracket"}
            </button>
          )}
        </div>
      </section>

      {/* Banner campeón */}
      {champion && (
        <div className="champion-banner" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {torneo?.estado === "finalizado" && (
            <div style={{
              background: "linear-gradient(135deg, #065f46, #047857)",
              color: "#6ee7b7",
              padding: "6px 20px",
              borderRadius: "20px",
              fontSize: "0.8rem",
              fontWeight: 700,
              letterSpacing: "2px",
              marginBottom: "12px",
              textTransform: "uppercase"
            }}>✅ TORNEO FINALIZADO</div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="champion-trophy">🏆</div>
            <div className="champion-info">
              <p className="champion-label">CAMPEÓN DEL TORNEO</p>
              <h2 className="champion-name">{champion.nombre}</h2>
            </div>
            <div className="champion-trophy">🏆</div>
          </div>
          {canDecide && torneo?.estado !== "finalizado" && (
            <button
              className="bracket-generate-btn"
              style={{ marginTop: "20px", background: "#e11d48" }}
              onClick={() => setShowFinalizeConfirm(true)}
              disabled={finalizing}
            >
              {finalizing ? "Finalizando..." : "🏁 Finalizar Torneo"}
            </button>
          )}
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
                <div className="bracket-round-label">{roundNames(totalRounds, ronda)}</div>
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
                        <div className="match-winner-chip">👑 Ganador: {match.ganador_nombre}</div>
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
                <button className="decide-btn" onClick={() => handleDecide(decidingMatch, decidingMatch.jugador1_id!)}>
                  <div className="decide-avatar">{decidingMatch.jugador1_nombre?.[0]?.toUpperCase()}</div>
                  {decidingMatch.jugador1_nombre}
                </button>
              )}
              {decidingMatch.jugador2_id && (
                <button className="decide-btn" onClick={() => handleDecide(decidingMatch, decidingMatch.jugador2_id!)}>
                  <div className="decide-avatar">{decidingMatch.jugador2_nombre?.[0]?.toUpperCase()}</div>
                  {decidingMatch.jugador2_nombre}
                </button>
              )}
            </div>
            <button className="decide-cancel" onClick={() => setDecidingMatch(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Modal: Confirmar reset de bracket */}
      {showResetConfirm && (
        <div className="modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="decide-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>⚠️</div>
            <h2 style={{ color: "#f97316", marginBottom: "12px" }}>¿Rehacer el Bracket?</h2>
            <div style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "20px",
              textAlign: "left"
            }}>
              <p style={{ color: "#fca5a5", fontWeight: 700, marginBottom: "8px" }}>
                🚨 Esta acción NO se puede deshacer
              </p>
              <ul style={{ color: "#94a3b8", fontSize: "0.9rem", paddingLeft: "18px", lineHeight: "1.8" }}>
                <li>Se eliminarán <strong style={{ color: "#e2e8f0" }}>todos los resultados</strong> actuales</li>
                <li>Se eliminarán <strong style={{ color: "#e2e8f0" }}>todas las partidas</strong> registradas</li>
                <li>El bracket se generará desde cero con un <strong style={{ color: "#e2e8f0" }}>nuevo sorteo aleatorio</strong></li>
                <li>Los jugadores inscritos <strong style={{ color: "#e2e8f0" }}>permanecerán</strong> en el torneo</li>
              </ul>
            </div>
            <p style={{ color: "#94a3b8", fontSize: "0.88rem", marginBottom: "24px" }}>
              ¿Estás seguro de que deseas continuar?
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                className="decide-cancel"
                onClick={() => setShowResetConfirm(false)}
                style={{ flex: 1 }}
              >
                ✕ Cancelar
              </button>
              <button
                onClick={handleReset}
                disabled={generating}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #dc2626, #991b1b)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  transition: "opacity 0.2s"
                }}
              >
                🔄 Sí, rehacer bracket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar finalización del torneo */}
      {showFinalizeConfirm && (
        <div className="modal-overlay" onClick={() => setShowFinalizeConfirm(false)}>
          <div className="decide-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "460px", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🏁</div>
            <h2 style={{ color: "#e11d48", marginBottom: "12px" }}>¿Finalizar el Torneo?</h2>
            <div style={{
              background: "rgba(225, 29, 72, 0.1)",
              border: "1px solid rgba(225, 29, 72, 0.35)",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "20px",
              textAlign: "left"
            }}>
              <p style={{ color: "#fda4af", fontWeight: 700, marginBottom: "8px" }}>
                Esta acción marcará el torneo como concluido.
              </p>
              <ul style={{ color: "#94a3b8", fontSize: "0.9rem", paddingLeft: "18px", lineHeight: "1.8" }}>
                <li>El torneo cambiará de estado a <strong style={{ color: "#e2e8f0" }}>Finalizado</strong></li>
                <li>Se registrará oficialmente al <strong style={{ color: "#e2e8f0" }}>campeón actual</strong></li>
                <li>No se podrán generar más cambios en el bracket</li>
              </ul>
            </div>
            <p style={{ color: "#94a3b8", fontSize: "0.88rem", marginBottom: "24px" }}>
              ¿Confirmas que deseas finalizar el torneo?
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                className="decide-cancel"
                onClick={() => setShowFinalizeConfirm(false)}
                style={{ flex: 1 }}
              >
                ✕ Cancelar
              </button>
              <button
                onClick={handleFinalizarTorneo}
                disabled={finalizing}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #e11d48, #9f1239)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: finalizing ? "not-allowed" : "pointer",
                  opacity: finalizing ? 0.6 : 1,
                  transition: "opacity 0.2s"
                }}
              >
                {finalizing ? "Finalizando..." : "🏆 Sí, finalizar torneo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default TournamentBracket;
