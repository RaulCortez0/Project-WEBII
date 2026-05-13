import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import "./EditTournament.css";

interface Game { id: number; nombre_juego: string; }
interface Tournament {
  id: number;
  name: string;
  game: string;
  gameId: number;
  type: string;
  players: number;
  registeredPlayers: number;
  startDate: string;
  endDate: string;
  status: string;
  bracketIniciado?: number;
  description?: string;
  prize?: string;
  rules?: string;
}

const API_URL = "http://localhost:3001";

const STATUS_LABELS: Record<string, string> = {
  abierto: "Abierto",
  "en curso": "En Curso",
  finalizado: "Finalizado",
  eliminado: "Eliminado",
};
const STATUS_COLOR: Record<string, string> = {
  abierto: "#22c55e",
  "en curso": "#f59e0b",
  finalizado: "#6366f1",
  eliminado: "#ef4444",
};

export default function EditTournament() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const isAdmin = user?.role === "admin";

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [editForm, setEditForm] = useState<Partial<Tournament>>({});
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<Tournament | null>(null);
  const [deleteMotivo, setDeleteMotivo] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) { navigate("/login"); return; }
    fetchData();
  }, [isLoggedIn, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Always load the user's OWN tournaments — admin has AdminDashboard for all
      const [tRes, gRes] = await Promise.all([
        fetch(`${API_URL}/torneos/usuario/${user?.id}`),
        fetch(`${API_URL}/videojuegos`)
      ]);
      const tData = await tRes.json();
      const gData = await gRes.json();
      setTournaments(Array.isArray(tData) ? tData : []);
      setGames(Array.isArray(gData) ? gData : []);
    } catch {
      toast.error("Error al cargar torneos");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (t: Tournament) => {
    setEditingTournament(t);
    setEditForm({
      name: t.name,
      gameId: t.gameId,
      type: t.type,
      players: t.players,
      startDate: t.startDate?.slice(0, 10),
      endDate: t.endDate?.slice(0, 10),
      description: t.description || "",
      prize: t.prize || "",
      rules: t.rules || "",
      status: t.status,
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTournament) return;
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/torneos/${editingTournament.id}`, {
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
          formato: editForm.type,
          premio: editForm.prize,
          reglas: editForm.rules,
          creado_por: user?.id,
          isAdmin,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      toast.success("✅ Torneo actualizado exitosamente");
      setEditingTournament(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const r = await fetch(`${API_URL}/torneos/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creado_por: user?.id, motivo: deleteMotivo.trim() || null, isAdmin }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      toast.success("🗑️ Torneo eliminado correctamente");
      setDeleteConfirm(null);
      setDeleteMotivo("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  const canEdit = (t: Tournament) => {
    if (isAdmin) return true;
    if (t.status === "eliminado" || t.status === "finalizado") return false;
    if (t.bracketIniciado && t.status !== "finalizado") return false;
    return true;
  };

  const canDelete = (t: Tournament) => {
    if (isAdmin) return true;
    if (t.status === "eliminado") return false;
    if (t.bracketIniciado && t.status !== "finalizado") return false;
    return true;
  };

  const filtered = tournaments.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.game?.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  return (
    <main className="edit-tournament-page">
      <section className="et-hero">
        <div className="et-hero-overlay" />
        <div className="et-hero-content">
          <div className="et-badge">{isAdmin ? "ADMIN" : "MIS TORNEOS"}</div>
          <h1>Gestionar Torneos</h1>
          <p>{isAdmin ? "Edita o elimina cualquier torneo del sistema" : "Edita o elimina tus torneos creados"}</p>
        </div>
      </section>

      <div className="et-body">
        {/* Search */}
        <div className="et-search-bar">
          <span className="et-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre o juego..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="et-clear" onClick={() => setSearch("")}>✕</button>}
          <span className="et-count">{filtered.length} torneo{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="et-empty"><div className="et-spinner" /><p>Cargando torneos...</p></div>
        ) : filtered.length === 0 ? (
          <div className="et-empty">
            <span style={{ fontSize: 48 }}>🎮</span>
            <h3>{search ? "Sin resultados" : "No tienes torneos creados"}</h3>
            <p>{search ? "Prueba con otro término" : "Crea tu primer torneo para empezar"}</p>
            {!search && <button className="et-create-btn" onClick={() => navigate("/crear-torneo")}>+ Crear Torneo</button>}
          </div>
        ) : (
          <div className="et-cards">
            {filtered.map(t => (
              <div className={`et-card ${t.status === "eliminado" ? "et-card-eliminated" : ""}`} key={t.id}>
                {/* Status badge */}
                <div className="et-card-status" style={{ background: STATUS_COLOR[t.status] ?? "#64748b" }}>
                  {STATUS_LABELS[t.status] ?? t.status}
                  {t.bracketIniciado && t.status !== "finalizado" && t.status !== "eliminado" && (
                    <span style={{ marginLeft: 6 }}>🔒</span>
                  )}
                </div>

                <div className="et-card-body">
                  <h3 className="et-card-name">{t.name}</h3>
                  <div className="et-card-details">
                    <div className="et-detail"><span>🎮</span>{t.game || "—"}</div>
                    <div className="et-detail"><span>🏆</span>{t.type || "—"}</div>
                    <div className="et-detail"><span>👥</span>{t.registeredPlayers ?? 0}/{t.players} jugadores</div>
                    <div className="et-detail"><span>📅</span>{fmt(t.startDate)} → {fmt(t.endDate)}</div>
                    {t.prize && <div className="et-detail"><span>🎁</span>{t.prize}</div>}
                  </div>

                  <div className="et-progress">
                    <div className="et-progress-bar">
                      <div className="et-progress-fill" style={{ width: `${Math.min(((t.registeredPlayers ?? 0) / t.players) * 100, 100)}%` }} />
                    </div>
                    <span>{Math.round(((t.registeredPlayers ?? 0) / t.players) * 100)}%</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="et-card-actions">
                  <button
                    className="et-btn-view"
                    onClick={() => navigate(`/torneo/${t.id}`)}
                  >
                    👁️ Ver
                  </button>
                  <button
                    className={`et-btn-edit ${!canEdit(t) ? "et-btn-disabled" : ""}`}
                    onClick={() => canEdit(t) && openEdit(t)}
                    disabled={!canEdit(t)}
                    title={!canEdit(t) ? (t.bracketIniciado ? "Bracket activo: solo admin puede editar" : "No editable") : "Editar torneo"}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    className={`et-btn-delete ${!canDelete(t) ? "et-btn-disabled" : ""}`}
                    onClick={() => canDelete(t) && setDeleteConfirm(t)}
                    disabled={!canDelete(t)}
                    title={!canDelete(t) ? (t.bracketIniciado ? "Bracket activo: solo admin puede eliminar" : "No eliminable") : "Eliminar torneo"}
                  >
                    🗑️ Eliminar
                  </button>
                </div>

                {/* Admin indicator */}
                {isAdmin && !canEdit(t) && t.status !== "eliminado" && (
                  <div className="et-admin-bypass">
                    <span>⚠️ Admin: puedes editar/eliminar aunque esté en curso</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal: Editar Torneo ───────────────────────────────── */}
      {editingTournament && (
        <div className="et-modal-overlay" onClick={() => setEditingTournament(null)}>
          <div className="et-modal" onClick={e => e.stopPropagation()}>
            <div className="et-modal-header">
              <h2>✏️ Editar Torneo</h2>
              <button className="et-modal-close" onClick={() => setEditingTournament(null)}>✕</button>
            </div>

            {!isAdmin && editingTournament.bracketIniciado && editingTournament.status !== "finalizado" && (
              <div className="et-warn-banner">
                🔒 Este torneo tiene un bracket activo. Solo el administrador puede editarlo.
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="et-form">
              <div className="et-form-group">
                <label>Nombre del Torneo</label>
                <input name="name" value={editForm.name ?? ""} onChange={handleEditChange} required />
              </div>
              <div className="et-form-row">
                <div className="et-form-group">
                  <label>Juego</label>
                  <select name="gameId" value={editForm.gameId ?? ""} onChange={handleEditChange}>
                    {games.map(g => <option key={g.id} value={g.id}>{g.nombre_juego}</option>)}
                  </select>
                </div>
                <div className="et-form-group">
                  <label>Estado</label>
                  <select name="status" value={editForm.status ?? "abierto"} onChange={handleEditChange}>
                    {["abierto", "en curso", "finalizado"].map(s =>
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    )}
                  </select>
                </div>
              </div>
              <div className="et-form-row">
                <div className="et-form-group">
                  <label>Fecha Inicio</label>
                  <input type="date" name="startDate" value={editForm.startDate ?? ""} onChange={handleEditChange} />
                </div>
                <div className="et-form-group">
                  <label>Fecha Fin</label>
                  <input type="date" name="endDate" value={editForm.endDate ?? ""} onChange={handleEditChange} />
                </div>
              </div>
              <div className="et-form-row">
                <div className="et-form-group">
                  <label>Máx. Participantes</label>
                  <input type="number" name="players" value={editForm.players ?? ""} onChange={handleEditChange} min={2} />
                </div>
                <div className="et-form-group">
                  <label>Premio</label>
                  <input name="prize" value={editForm.prize ?? ""} onChange={handleEditChange} />
                </div>
              </div>
              <div className="et-form-group">
                <label>Descripción</label>
                <textarea name="description" value={editForm.description ?? ""} onChange={handleEditChange} rows={3} />
              </div>
              <div className="et-form-group">
                <label>Reglas</label>
                <textarea name="rules" value={editForm.rules ?? ""} onChange={handleEditChange} rows={3} />
              </div>
              <div className="et-modal-actions">
                <button type="button" className="et-btn-cancel" onClick={() => setEditingTournament(null)}>Cancelar</button>
                <button type="submit" className="et-btn-save" disabled={saving}>
                  {saving ? "Guardando..." : "💾 Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar Eliminación ──────────────────────── */}
      {deleteConfirm && (
        <div className="et-modal-overlay" onClick={() => { setDeleteConfirm(null); setDeleteMotivo(""); }}>
          <div className="et-modal et-modal-confirm" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "3rem", marginBottom: 8 }}>🗑️</div>
            <h2 style={{ color: "#f87171", marginBottom: 8 }}>¿Eliminar torneo?</h2>
            <p style={{ color: "#94a3b8", marginBottom: 16, fontSize: "0.95rem" }}>
              El torneo <strong style={{ color: "#e2e8f0" }}>"{deleteConfirm.name}"</strong> será marcado como eliminado.
              {isAdmin ? " (Eliminación lógica)" : " Esta acción no se puede deshacer fácilmente."}
            </p>

            <div className="et-form-group" style={{ textAlign: "left", marginBottom: 20 }}>
              <label style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>
                Motivo <span style={{ color: "#475569", fontWeight: 400 }}>(opcional)</span>
              </label>
              <textarea
                value={deleteMotivo}
                onChange={e => setDeleteMotivo(e.target.value)}
                placeholder="Ej: Torneo duplicado, sin participantes..."
                rows={3}
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, color: "#e2e8f0", padding: "10px 14px", fontSize: "0.88rem", fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div className="et-modal-actions">
              <button className="et-btn-cancel" onClick={() => { setDeleteConfirm(null); setDeleteMotivo(""); }}>✕ Cancelar</button>
              <button className="et-btn-delete" onClick={handleDelete} disabled={deleting} style={{ background: "#dc2626" }}>
                {deleting ? "Eliminando..." : "🗑️ Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}