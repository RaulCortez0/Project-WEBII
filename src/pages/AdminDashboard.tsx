import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AdminDashboard.css";

const API_URL = "http://localhost:3001";

type Tab = "torneos" | "popularidad" | "ranking" | "ocupacion" | "cupos";

interface Torneo {
  id: number;
  name: string;
  game: string;
  startDate: string;
  endDate: string;
  players: number;
  status: string;
  description: string;
  type: string;
  createdBy: number;
  prize: string;
  rules: string;
  gameId: number;
  registeredPlayers: number;
}

interface PopularidadRow {
  id: number;
  juego: string;
  genero: string;
  plataforma: string;
  total_torneos: number;
  total_inscritos: number;
}

interface RankingRow {
  id: number;
  username: string;
  email: string;
  role: string;
  victorias: number;
  torneos_participados: number;
}

interface OcupacionRow {
  id: number;
  nombre: string;
  juego: string;
  estado: string;
  max_participantes: number;
  inscritos: number;
  porcentaje_llenado: number;
}

interface CuposRow {
  id: number;
  nombre: string;
  juego: string;
  estado: string;
  max_participantes: number;
  inscritos: number;
  cupos_disponibles: number;
}

interface EditModal {
  open: boolean;
  torneo: Torneo | null;
}

interface Game {
  id: number;
  nombre_juego: string;
}

const statusLabel: Record<string, string> = {
  abierto: "Abierto",
  "en curso": "En Curso",
  finalizado: "Finalizado",
  eliminado: "Eliminado",
};

const statusClass: Record<string, string> = {
  abierto: "status-open",
  "en curso": "status-active",
  finalizado: "status-done",
  eliminado: "status-deleted",
};

const AdminDashboard = () => {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>("torneos");
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [popularidad, setPopularidad] = useState<PopularidadRow[]>([]);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [ocupacion, setOcupacion] = useState<OcupacionRow[]>([]);
  const [cupos, setCupos] = useState<CuposRow[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState<EditModal>({ open: false, torneo: null });
  const [editForm, setEditForm] = useState<Partial<Torneo>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleteMotivo, setDeleteMotivo] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Guard: solo admin
  useEffect(() => {
    if (!isLoggedIn || user?.role !== "admin") {
      navigate("/");
    }
  }, [isLoggedIn, user, navigate]);

  // Carga inicial
  useEffect(() => {
    if (isLoggedIn && user?.role === "admin") {
      fetchTorneos();
      fetchGames();
    }
  }, [isLoggedIn, user]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTorneos = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/admin/torneos`);
      if (r.ok) setTorneos(await r.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const fetchGames = async () => {
    try {
      const r = await fetch(`${API_URL}/videojuegos`);
      if (r.ok) setGames(await r.json());
    } catch { /* ignore */ }
  };

  const fetchReport = async (tab: Tab) => {
    const map: Partial<Record<Tab, string>> = {
      popularidad: "popularidad-juegos",
      ranking: "ranking-jugadores",
      ocupacion: "ocupacion-torneos",
      cupos: "disponibilidad-cupos",
    };
    const endpoint = map[tab];
    if (!endpoint) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/admin/reportes/${endpoint}`);
      if (!r.ok) throw new Error();
      const data = await r.json();
      if (tab === "popularidad") setPopularidad(data);
      else if (tab === "ranking") setRanking(data);
      else if (tab === "ocupacion") setOcupacion(data);
      else if (tab === "cupos") setCupos(data);
    } catch {
      showToast("Error al cargar el reporte", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab !== "torneos") fetchReport(tab);
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const openEdit = (t: Torneo) => {
    setEditForm({
      ...t,
      startDate: t.startDate?.split("T")[0] ?? "",
      endDate: t.endDate?.split("T")[0] ?? "",
    });
    setEditModal({ open: true, torneo: t });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.torneo) return;
    setLoading(true);
    try {
      const elimTypes: Record<string, string> = {
        simple: "Eliminación Simple",
        double: "Doble Eliminación",
        league: "Liga (Todos contra todos)",
        group: "Fase de grupos + Eliminación",
        swiss: "Sistema Suizo",
      };
      const formato = elimTypes[editForm.type ?? ""] ?? editForm.type;
      const r = await fetch(`${API_URL}/admin/torneos/${editModal.torneo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: editForm.name,
          juego_id: editForm.gameId,
          fecha_inicio: editForm.startDate,
          fecha_fin: editForm.endDate,
          max_participantes: editForm.players,
          descripcion: editForm.description,
          estado: editForm.status,
          formato,
          premio: editForm.prize,
          reglas: editForm.rules,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      showToast("Torneo actualizado correctamente");
      setEditModal({ open: false, torneo: null });
      fetchTorneos();
    } catch (err: any) {
      showToast(err.message ?? "Error al actualizar", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Delete lógico ─────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/admin/torneos/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: deleteMotivo.trim() || null }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      showToast("Torneo eliminado lógicamente");
      setDeleteConfirm(null);
      setDeleteMotivo("");
      fetchTorneos();
    } catch (err: any) {
      showToast(err.message ?? "Error al eliminar", "error");
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "torneos", label: "Gestión de Torneos", icon: "🏆" },
    { id: "popularidad", label: "Popularidad de Juegos", icon: "🎮" },
    { id: "ranking", label: "Ranking de Jugadores", icon: "👑" },
    { id: "ocupacion", label: "Ocupación de Torneos", icon: "📊" },
    { id: "cupos", label: "Disponibilidad de Cupos", icon: "🪑" },
  ];

  const statusOptions = ["abierto", "en curso", "finalizado"];

  if (!isLoggedIn || user?.role !== "admin") return null;

  return (
    <main className="admin-dashboard">
      {/* Toast */}
      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <section className="admin-hero">
        <div className="admin-hero-overlay" />
        <div className="admin-hero-content">
          <div className="admin-badge">PANEL ADMINISTRADOR</div>
          <h1>Centro de Control</h1>
          <p>Gestiona torneos y visualiza reportes del sistema</p>
        </div>
      </section>

      {/* Tabs */}
      <nav className="admin-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`admin-tab ${activeTab === t.id ? "active" : ""}`}
            onClick={() => handleTabChange(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      <div className="admin-content">
        {loading && (
          <div className="admin-loading">
            <div className="spinner" />
            <p>Cargando datos...</p>
          </div>
        )}

        {/* ── TAB: Torneos ──────────────────────────────────────────────── */}
        {activeTab === "torneos" && !loading && (
          <section className="admin-section">
            <div className="section-header">
              <h2>🏆 Gestión de Torneos</h2>
              <span className="section-count">{torneos.length} torneos totales</span>
            </div>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Juego</th>
                    <th>Estado</th>
                    <th>Inscritos / Max</th>
                    <th>Inicio</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {torneos.map(t => (
                    <tr key={t.id} className={t.status === "eliminado" ? "row-deleted" : ""}>
                      <td><span className="id-badge">#{t.id}</span></td>
                      <td className="td-name">{t.name}</td>
                      <td>{t.game}</td>
                      <td>
                        <span className={`status-chip ${statusClass[t.status] ?? ""}`}>
                          {statusLabel[t.status] ?? t.status}
                        </span>
                      </td>
                      <td>
                        <div className="players-cell">
                          <span>{t.registeredPlayers}/{t.players}</span>
                          <div className="mini-bar">
                            <div
                              className="mini-bar-fill"
                              style={{ width: `${Math.min((t.registeredPlayers / t.players) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>{t.startDate ? new Date(t.startDate).toLocaleDateString("es-MX") : "—"}</td>
                      <td>
                        <div className="action-btns">
                          {t.status !== "eliminado" && (
                            <>
                              <button
                                className="btn-edit"
                                onClick={() => openEdit(t)}
                                title="Editar torneo"
                              >✏️</button>
                              <button
                                className="btn-delete"
                                onClick={() => setDeleteConfirm(t.id)}
                                title="Eliminar torneo"
                              >🗑️</button>
                            </>
                          )}
                          {t.status === "eliminado" && (
                            <span className="deleted-label">Eliminado</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── TAB: Popularidad de Juegos ────────────────────────────────── */}
        {activeTab === "popularidad" && !loading && (
          <section className="admin-section">
            <div className="section-header">
              <h2>🎮 Popularidad de Juegos</h2>
              <p className="section-desc">Cruza Videojuegos con Torneos para mostrar qué juego tiene más torneos e inscritos totales.</p>
            </div>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Juego</th>
                    <th>Género</th>
                    <th>Plataforma</th>
                    <th>Torneos Creados</th>
                    <th>Total Inscritos</th>
                  </tr>
                </thead>
                <tbody>
                  {popularidad.map((r, i) => (
                    <tr key={r.id}>
                      <td><span className="rank-badge">{i + 1}</span></td>
                      <td className="td-name">{r.juego}</td>
                      <td><span className="tag">{r.genero}</span></td>
                      <td><span className="tag tag-alt">{r.plataforma}</span></td>
                      <td>
                        <span className="metric metric-torneos">{r.total_torneos}</span>
                      </td>
                      <td>
                        <span className="metric metric-inscritos">{r.total_inscritos}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── TAB: Ranking de Jugadores ─────────────────────────────────── */}
        {activeTab === "ranking" && !loading && (
          <section className="admin-section">
            <div className="section-header">
              <h2>👑 Ranking de Jugadores</h2>
              <p className="section-desc">Cruza Usuarios con Partidas para obtener quién tiene más victorias acumuladas (ganador_id).</p>
            </div>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Jugador</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Victorias</th>
                    <th>Torneos Jugados</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r, i) => (
                    <tr key={r.id}>
                      <td>
                        <span className={`rank-badge ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}`}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                        </span>
                      </td>
                      <td className="td-name">
                        <div className="player-cell">
                          <div className="avatar-mini">{r.username[0].toUpperCase()}</div>
                          {r.username}
                        </div>
                      </td>
                      <td className="td-email">{r.email}</td>
                      <td><span className={`role-chip role-${r.role}`}>{r.role}</span></td>
                      <td><span className="metric metric-torneos">{r.victorias}</span></td>
                      <td><span className="metric metric-inscritos">{r.torneos_participados}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── TAB: Ocupación de Torneos ─────────────────────────────────── */}
        {activeTab === "ocupacion" && !loading && (
          <section className="admin-section">
            <div className="section-header">
              <h2>📊 Ocupación de Torneos</h2>
              <p className="section-desc">Compara max_participantes con el conteo de Inscripciones para ver el % de llenado de cada torneo.</p>
            </div>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Torneo</th>
                    <th>Juego</th>
                    <th>Estado</th>
                    <th>Inscritos</th>
                    <th>Máximo</th>
                    <th>% Llenado</th>
                  </tr>
                </thead>
                <tbody>
                  {ocupacion.map(r => (
                    <tr key={r.id}>
                      <td className="td-name">{r.nombre}</td>
                      <td>{r.juego}</td>
                      <td>
                        <span className={`status-chip ${statusClass[r.estado] ?? ""}`}>
                          {statusLabel[r.estado] ?? r.estado}
                        </span>
                      </td>
                      <td>{r.inscritos}</td>
                      <td>{r.max_participantes}</td>
                      <td>
                        <div className="pct-cell">
                          <div className="pct-bar">
                            <div
                              className={`pct-fill ${r.porcentaje_llenado >= 90 ? "pct-danger" : r.porcentaje_llenado >= 60 ? "pct-warn" : "pct-ok"}`}
                              style={{ width: `${Math.min(r.porcentaje_llenado, 100)}%` }}
                            />
                          </div>
                          <span className="pct-label">{r.porcentaje_llenado}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── TAB: Disponibilidad de Cupos ──────────────────────────────── */}
        {activeTab === "cupos" && !loading && (
          <section className="admin-section">
            <div className="section-header">
              <h2>🪑 Disponibilidad de Cupos</h2>
              <p className="section-desc">Lista de torneos donde el conteo de Inscripciones es menor al max_participantes.</p>
            </div>
            <div className="cards-grid">
              {cupos.length === 0 && (
                <p className="empty-state">Todos los torneos están llenos o no hay torneos activos.</p>
              )}
              {cupos.map(r => (
                <div key={r.id} className="cupo-card">
                  <div className="cupo-header">
                    <h3>{r.nombre}</h3>
                    <span className={`status-chip ${statusClass[r.estado] ?? ""}`}>
                      {statusLabel[r.estado] ?? r.estado}
                    </span>
                  </div>
                  <p className="cupo-game">🎮 {r.juego}</p>
                  <div className="cupo-stats">
                    <div className="cupo-stat">
                      <span className="cupo-num available">{r.cupos_disponibles}</span>
                      <span className="cupo-sub">cupos libres</span>
                    </div>
                    <div className="cupo-stat">
                      <span className="cupo-num">{r.inscritos}</span>
                      <span className="cupo-sub">inscritos</span>
                    </div>
                    <div className="cupo-stat">
                      <span className="cupo-num">{r.max_participantes}</span>
                      <span className="cupo-sub">máximo</span>
                    </div>
                  </div>
                  <div className="cupo-bar-wrap">
                    <div className="cupo-bar">
                      <div
                        className="cupo-bar-fill"
                        style={{ width: `${Math.min((r.inscritos / r.max_participantes) * 100, 100)}%` }}
                      />
                    </div>
                    <span>{Math.round((r.inscritos / r.max_participantes) * 100)}% ocupado</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Modal Editar Torneo ──────────────────────────────────────────── */}
      {editModal.open && editModal.torneo && (
        <div className="modal-overlay" onClick={() => setEditModal({ open: false, torneo: null })}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Editar Torneo</h2>
              <button className="modal-close" onClick={() => setEditModal({ open: false, torneo: null })}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit} className="modal-form">
              <div className="mf-group">
                <label>Nombre del Torneo</label>
                <input name="name" value={editForm.name ?? ""} onChange={handleEditChange} required />
              </div>
              <div className="mf-row">
                <div className="mf-group">
                  <label>Juego</label>
                  <select name="gameId" value={editForm.gameId ?? ""} onChange={handleEditChange}>
                    {games.map(g => <option key={g.id} value={g.id}>{g.nombre_juego}</option>)}
                  </select>
                </div>
                <div className="mf-group">
                  <label>Estado</label>
                  <select name="status" value={editForm.status ?? "abierto"} onChange={handleEditChange}>
                    {statusOptions.map(s => (
                      <option key={s} value={s}>{statusLabel[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mf-row">
                <div className="mf-group">
                  <label>Fecha Inicio</label>
                  <input type="date" name="startDate" value={editForm.startDate ?? ""} onChange={handleEditChange} />
                </div>
                <div className="mf-group">
                  <label>Fecha Fin</label>
                  <input type="date" name="endDate" value={editForm.endDate ?? ""} onChange={handleEditChange} />
                </div>
              </div>
              <div className="mf-row">
                <div className="mf-group">
                  <label>Máx. Participantes</label>
                  <input type="number" name="players" value={editForm.players ?? ""} onChange={handleEditChange} min={1} />
                </div>
                <div className="mf-group">
                  <label>Premio</label>
                  <input name="prize" value={editForm.prize ?? ""} onChange={handleEditChange} />
                </div>
              </div>
              <div className="mf-group">
                <label>Descripción</label>
                <textarea name="description" value={editForm.description ?? ""} onChange={handleEditChange} rows={3} />
              </div>
              <div className="mf-group">
                <label>Reglas</label>
                <textarea name="rules" value={editForm.rules ?? ""} onChange={handleEditChange} rows={3} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setEditModal({ open: false, torneo: null })}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ───────────────────────────────────────────────── */}
      {deleteConfirm !== null && (
        <div className="modal-overlay" onClick={() => { setDeleteConfirm(null); setDeleteMotivo(""); }}>
          <div className="modal-box confirm-box" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">🗑️</div>
            <h2>¿Eliminar este torneo?</h2>
            <p>El torneo será marcado como <strong>eliminado</strong> pero permanecerá en la base de datos (eliminación lógica).</p>
            <div className="mf-group" style={{ textAlign: "left", marginBottom: "16px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                Motivo de eliminación <span style={{ color: "#475569", fontWeight: 400 }}>(opcional)</span>
              </label>
              <textarea
                value={deleteMotivo}
                onChange={e => setDeleteMotivo(e.target.value)}
                placeholder="Ej: Torneo duplicado, sin participantes suficientes..."
                rows={3}
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", color: "#e2e8f0", padding: "10px 14px", fontSize: "0.88rem", fontFamily: "Inter, sans-serif", resize: "vertical", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => { setDeleteConfirm(null); setDeleteMotivo(""); }}>Cancelar</button>
              <button className="btn-delete-confirm" onClick={() => handleDelete(deleteConfirm)} disabled={loading}>
                {loading ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default AdminDashboard;
