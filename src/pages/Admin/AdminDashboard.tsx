import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import "./AdminDashboard.css";

const API_URL = "http://localhost:3001";

type Tab = "torneos" | "popularidad" | "ranking" | "campeones" | "ocupacion" | "cupos";

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
  bracketIniciado: number;
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

interface CampeonesRow {
  id: number;
  username: string;
  email: string;
  torneos_ganados: number;
  partidas_jugadas: number;
  partidas_ganadas: number;
  partidas_perdidas: number;
  pct_victorias: number;
  pct_derrotas: number;
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
  const [campeones, setCampeones] = useState<CampeonesRow[]>([]);
  const [ocupacion, setOcupacion] = useState<OcupacionRow[]>([]);
  const [cupos, setCupos] = useState<CuposRow[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState<EditModal>({ open: false, torneo: null });
  const [editForm, setEditForm] = useState<Partial<Torneo>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleteMotivo, setDeleteMotivo] = useState("");
  const [deleteType, setDeleteType] = useState<"logico" | "real">("logico");

  // ── Filtros: Gestión de Torneos ─────────────────────────────────────────
  const [torneoSearch, setTorneoSearch] = useState("");
  const [torneoStatus, setTorneoStatus] = useState("");
  const [torneoSort, setTorneoSort] = useState<"nombre" | "fecha_asc" | "fecha_desc" | "inscritos_desc" | "inscritos_asc" | "max_desc" | "max_asc">("nombre");

  // ── Filtros: Ocupación & Cupos ───────────────────────────────────────────
  const [ocSearch, setOcSearch] = useState("");
  const [ocSort, setOcSort] = useState<"nombre" | "fecha" | "max_asc" | "max_desc">("nombre");
  const [cuSearch, setCuSearch] = useState("");
  const [cuSort, setCuSort] = useState<"nombre" | "fecha" | "max_asc" | "max_desc">("nombre");

  // ── Filtros: Ranking & Campeones ─────────────────────────────────────────
  const [rankSearch, setRankSearch] = useState("");
  const [rankSort, setRankSort] = useState<"victorias_desc" | "victorias_asc" | "torneos_desc" | "torneos_asc">("victorias_desc");
  const [campSearch, setCampSearch] = useState("");
  const [campSort, setCampSort] = useState<"ganados_desc" | "ganados_asc" | "pct_desc" | "pct_asc">("ganados_desc");

  // ── Filtros: Popularidad ─────────────────────────────────────────────────
  const [popSearch, setPopSearch] = useState("");
  const [popSort, setPopSort] = useState<"torneos_desc" | "torneos_asc" | "nombre_asc" | "nombre_desc" | "plataforma_asc" | "plataforma_desc" | "genero_asc" | "genero_desc">("torneos_desc");

  // ── Datos derivados: Ocupación ───────────────────────────────────────────
  const filteredOcupacion = ocupacion
    .filter(r => {
      const q = ocSearch.toLowerCase();
      return r.nombre?.toLowerCase().includes(q) || r.juego?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (ocSort === "nombre") return a.nombre.localeCompare(b.nombre);
      if (ocSort === "max_asc") return a.max_participantes - b.max_participantes;
      if (ocSort === "max_desc") return b.max_participantes - a.max_participantes;
      return 0;
    });

  // ── Datos derivados: Cupos ───────────────────────────────────────────────
  const filteredCupos = cupos
    .filter(r => {
      const q = cuSearch.toLowerCase();
      return r.nombre?.toLowerCase().includes(q) || r.juego?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (cuSort === "nombre") return a.nombre.localeCompare(b.nombre);
      if (cuSort === "max_asc") return a.max_participantes - b.max_participantes;
      if (cuSort === "max_desc") return b.max_participantes - a.max_participantes;
      return 0;
    });

  // ── Datos derivados: Ranking ─────────────────────────────────────────────
  const filteredRanking = ranking
    .filter(r => r.username?.toLowerCase().includes(rankSearch.toLowerCase()))
    .sort((a, b) => {
      if (rankSort === "victorias_desc") return b.victorias - a.victorias;
      if (rankSort === "victorias_asc") return a.victorias - b.victorias;
      if (rankSort === "torneos_desc") return b.torneos_participados - a.torneos_participados;
      if (rankSort === "torneos_asc") return a.torneos_participados - b.torneos_participados;
      return 0;
    });

  // ── Datos derivados: Campeones ───────────────────────────────────────────
  const filteredCampeones = campeones
    .filter(r => r.username?.toLowerCase().includes(campSearch.toLowerCase()))
    .sort((a, b) => {
      if (campSort === "ganados_desc") return b.torneos_ganados - a.torneos_ganados;
      if (campSort === "ganados_asc") return a.torneos_ganados - b.torneos_ganados;
      if (campSort === "pct_desc") return b.pct_victorias - a.pct_victorias;
      if (campSort === "pct_asc") return a.pct_victorias - b.pct_victorias;
      return 0;
    });

  // ── Datos derivados: Popularidad ─────────────────────────────────────────
  const filteredPopularidad = popularidad
    .filter(r => {
      const q = popSearch.toLowerCase();
      return r.juego?.toLowerCase().includes(q)
        || r.plataforma?.toLowerCase().includes(q)
        || r.genero?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (popSort === "torneos_desc") return b.total_torneos - a.total_torneos;
      if (popSort === "torneos_asc") return a.total_torneos - b.total_torneos;
      if (popSort === "nombre_asc") return a.juego.localeCompare(b.juego);
      if (popSort === "nombre_desc") return b.juego.localeCompare(a.juego);
      if (popSort === "plataforma_asc") return (a.plataforma ?? "").localeCompare(b.plataforma ?? "");
      if (popSort === "plataforma_desc") return (b.plataforma ?? "").localeCompare(a.plataforma ?? "");
      if (popSort === "genero_asc") return (a.genero ?? "").localeCompare(b.genero ?? "");
      if (popSort === "genero_desc") return (b.genero ?? "").localeCompare(a.genero ?? "");
      return 0;
    });

  // ── Datos derivados: Torneos ─────────────────────────────────────────────
  const getEffectiveStatusAdmin = (t: Torneo) => {
    if (t.status === "eliminado") return "eliminado";
    if (t.status === "finalizado") return "finalizado";
    if (new Date() > new Date(t.endDate)) return "finalizado";
    if (t.status === "en curso" || t.bracketIniciado) return "en curso";
    return t.status;
  };

  const filteredTorneos = torneos
    .filter(t => {
      const q = torneoSearch.toLowerCase();
      const matchSearch = !q
        || t.name?.toLowerCase().includes(q)
        || t.game?.toLowerCase().includes(q)
        || t.type?.toLowerCase().includes(q);
      const eff = getEffectiveStatusAdmin(t);
      const matchStatus = !torneoStatus || eff === torneoStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (torneoSort === "nombre") return a.name.localeCompare(b.name);
      if (torneoSort === "fecha_asc") return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      if (torneoSort === "fecha_desc") return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      if (torneoSort === "inscritos_desc") return b.registeredPlayers - a.registeredPlayers;
      if (torneoSort === "inscritos_asc") return a.registeredPlayers - b.registeredPlayers;
      if (torneoSort === "max_desc") return b.players - a.players;
      if (torneoSort === "max_asc") return a.players - b.players;
      return 0;
    });

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
    if (type === "success") toast.success(msg);
    else toast.error(msg);
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
      campeones: "campeones",
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
      else if (tab === "campeones") setCampeones(data);
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
      const endpoint = deleteType === "real"
        ? `${API_URL}/admin/torneos/${id}/real`
        : `${API_URL}/admin/torneos/${id}/logico`;
      const r = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: deleteMotivo.trim() || null }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      showToast(deleteType === "real" ? "Torneo eliminado permanentemente" : "Torneo eliminado lógicamente");
      setDeleteConfirm(null);
      setDeleteMotivo("");
      setDeleteType("logico");
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
    { id: "campeones", label: "Campeones", icon: "🥇" },
    { id: "ocupacion", label: "Ocupación de Torneos", icon: "📊" },
    { id: "cupos", label: "Disponibilidad de Cupos", icon: "🪑" },
  ];

  const statusOptions = ["abierto", "en curso", "finalizado"];

  if (!isLoggedIn || user?.role !== "admin") return null;

  return (
    <main className="admin-dashboard">
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
              <span className="section-count">{filteredTorneos.length} de {torneos.length} torneos</span>
            </div>
            <div className="report-controls">
              <input
                className="report-search"
                placeholder="🔍 Buscar por nombre, juego o formato..."
                value={torneoSearch}
                onChange={e => setTorneoSearch(e.target.value)}
              />
              <select className="report-sort" value={torneoStatus} onChange={e => setTorneoStatus(e.target.value)}>
                <option value="">Todos los estados</option>
                <option value="abierto">Abierto</option>
                <option value="en curso">En Curso</option>
                <option value="finalizado">Finalizado</option>
                <option value="eliminado">Eliminado</option>
              </select>
              <select className="report-sort" value={torneoSort} onChange={e => setTorneoSort(e.target.value as any)}>
                <option value="nombre">Nombre A→Z</option>
                <option value="fecha_asc">Fecha más antigua primero</option>
                <option value="fecha_desc">Fecha más reciente primero</option>
                <option value="inscritos_desc">Más inscritos primero</option>
                <option value="inscritos_asc">Menos inscritos primero</option>
                <option value="max_desc">Mayor capacidad primero</option>
                <option value="max_asc">Menor capacidad primero</option>
              </select>
            </div>
            <div className="table-wrapper">
              {filteredTorneos.length === 0 && <p className="empty-state">No hay torneos que coincidan con la búsqueda.</p>}
              {filteredTorneos.length > 0 && (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th><th>Nombre</th><th>Juego</th><th>Estado</th><th>Inscritos / Max</th><th>Inicio</th><th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTorneos.map(t => {
                      const eff = getEffectiveStatusAdmin(t);
                      return (
                        <tr key={t.id} className={t.status === "eliminado" ? "row-deleted" : ""}>
                          <td><span className="id-badge">#{t.id}</span></td>
                          <td className="td-name">{t.name}</td>
                          <td>{t.game}</td>
                          <td>
                            <span className={`status-chip ${statusClass[eff] ?? ""}`}>
                              {statusLabel[eff] ?? eff}
                              {eff === "finalizado" && t.status !== "finalizado" && <span style={{fontSize:"0.7rem",marginLeft:4}}>📅</span>}
                            </span>
                          </td>
                          <td>
                            <div className="players-cell">
                              <span>{t.registeredPlayers}/{t.players}</span>
                              <div className="mini-bar">
                                <div className="mini-bar-fill" style={{width:`${Math.min((t.registeredPlayers/t.players)*100,100)}%`}}/>
                              </div>
                            </div>
                          </td>
                          <td>{t.startDate ? new Date(t.startDate).toLocaleDateString("es-MX") : "—"}</td>
                          <td>
                            <div className="action-btns">
                              {t.status !== "eliminado" && (
                                <>
                                  <button className="btn-edit" onClick={() => openEdit(t)} title="Editar torneo">✏️</button>
                                  <button className="btn-delete" onClick={() => setDeleteConfirm(t.id)} title="Eliminar torneo">🗑️</button>
                                </>
                              )}
                              {t.status === "eliminado" && <span className="deleted-label">Eliminado</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
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
            <div className="report-controls">
              <input className="report-search" placeholder="🔍 Buscar por juego, género o plataforma..." value={popSearch} onChange={e => setPopSearch(e.target.value)} />
              <select className="report-sort" value={popSort} onChange={e => setPopSort(e.target.value as any)}>
                <option value="torneos_desc">Más torneos primero</option>
                <option value="torneos_asc">Menos torneos primero</option>
                <option value="nombre_asc">Nombre A→Z</option>
                <option value="nombre_desc">Nombre Z→A</option>
                <option value="plataforma_asc">Plataforma A→Z</option>
                <option value="plataforma_desc">Plataforma Z→A</option>
                <option value="genero_asc">Género A→Z</option>
                <option value="genero_desc">Género Z→A</option>
              </select>
              <span className="report-count">{filteredPopularidad.length} resultado{filteredPopularidad.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th><th>Juego</th><th>Género</th><th>Plataforma</th><th>Torneos</th><th>Inscritos</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPopularidad.map((r, i) => (
                    <tr key={r.id}>
                      <td><span className="rank-badge">{i + 1}</span></td>
                      <td className="td-name">{r.juego}</td>
                      <td><span className="tag">{r.genero}</span></td>
                      <td><span className="tag tag-alt">{r.plataforma}</span></td>
                      <td><span className="metric metric-torneos">{r.total_torneos}</span></td>
                      <td><span className="metric metric-inscritos">{r.total_inscritos}</span></td>
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
              <p className="section-desc">Jugadores con más victorias y torneos jugados.</p>
            </div>
            <div className="report-controls">
              <input className="report-search" placeholder="🔍 Buscar jugador por nombre..." value={rankSearch} onChange={e => setRankSearch(e.target.value)} />
              <select className="report-sort" value={rankSort} onChange={e => setRankSort(e.target.value as any)}>
                <option value="victorias_desc">Más victorias primero</option>
                <option value="victorias_asc">Menos victorias primero</option>
                <option value="torneos_desc">Más torneos jugados</option>
                <option value="torneos_asc">Menos torneos jugados</option>
              </select>
              <span className="report-count">{filteredRanking.length} jugador{filteredRanking.length !== 1 ? 'es' : ''}</span>
            </div>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th><th>Jugador</th><th>Email</th><th>Rol</th><th>Victorias</th><th>Torneos</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRanking.map((r, i) => (
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

        {/* ── TAB: Campeones ────────────────────────────────────────────── */}
        {activeTab === "campeones" && !loading && (
          <section className="admin-section">
            <div className="section-header">
              <h2>🥇 Reporte de Campeones</h2>
              <p className="section-desc">Jugadores con más torneos ganados y estadísticas de victorias/derrotas.</p>
            </div>
            <div className="report-controls">
              <input className="report-search" placeholder="🔍 Buscar campeón por nombre..." value={campSearch} onChange={e => setCampSearch(e.target.value)} />
              <select className="report-sort" value={campSort} onChange={e => setCampSort(e.target.value as any)}>
                <option value="ganados_desc">Más torneos ganados</option>
                <option value="ganados_asc">Menos torneos ganados</option>
                <option value="pct_desc">Mayor % victorias</option>
                <option value="pct_asc">Menor % victorias</option>
              </select>
              <span className="report-count">{filteredCampeones.length} jugador{filteredCampeones.length !== 1 ? 'es' : ''}</span>
            </div>
            {filteredCampeones.length === 0 && <p className="empty-state">No hay resultados.</p>}
            {filteredCampeones.length > 0 && (
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Jugador</th><th>Email</th><th>🏆 Ganados</th><th>⚔️ Partidas</th><th>✅ Wins</th><th>❌ Losses</th><th>% Win</th><th>% Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCampeones.map((r, i) => (
                      <tr key={r.id}>
                        <td><span className={`rank-badge ${i===0?"gold":i===1?"silver":i===2?"bronze":""}`}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</span></td>
                        <td className="td-name"><div className="player-cell"><div className="avatar-mini">{r.username[0].toUpperCase()}</div>{r.username}</div></td>
                        <td className="td-email">{r.email}</td>
                        <td><span className="metric metric-torneos">{r.torneos_ganados}</span></td>
                        <td><span className="metric">{r.partidas_jugadas}</span></td>
                        <td><span className="metric metric-torneos">{r.partidas_ganadas}</span></td>
                        <td><span className="metric metric-inscritos">{r.partidas_perdidas}</span></td>
                        <td><div className="pct-cell"><div className="pct-bar"><div className={`pct-fill ${r.pct_victorias>=70?"pct-ok":r.pct_victorias>=40?"pct-warn":"pct-danger"}`} style={{width:`${r.pct_victorias}%`}}/></div><span className="pct-label">{r.pct_victorias}%</span></div></td>
                        <td><div className="pct-cell"><div className="pct-bar"><div className={`pct-fill ${r.pct_derrotas<=30?"pct-ok":r.pct_derrotas<=60?"pct-warn":"pct-danger"}`} style={{width:`${r.pct_derrotas}%`}}/></div><span className="pct-label">{r.pct_derrotas}%</span></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── TAB: Ocupación de Torneos ─────────────────────────────────── */}
        {activeTab === "ocupacion" && !loading && (
          <section className="admin-section">
            <div className="section-header">
              <h2>📊 Ocupación de Torneos</h2>
              <p className="section-desc">% de llenado de cada torneo respecto a su máximo de participantes.</p>
            </div>
            <div className="report-controls">
              <input className="report-search" placeholder="🔍 Buscar por nombre o juego..." value={ocSearch} onChange={e => setOcSearch(e.target.value)} />
              <select className="report-sort" value={ocSort} onChange={e => setOcSort(e.target.value as any)}>
                <option value="nombre">Orden alfabético</option>
                <option value="max_asc">Máx. jugadores (menor primero)</option>
                <option value="max_desc">Máx. jugadores (mayor primero)</option>
              </select>
              <span className="report-count">{filteredOcupacion.length} torneo{filteredOcupacion.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Torneo</th><th>Juego</th><th>Estado</th><th>Inscritos</th><th>Máximo</th><th>% Llenado</th></tr></thead>
                <tbody>
                  {filteredOcupacion.map(r => (
                    <tr key={r.id}>
                      <td className="td-name">{r.nombre}</td>
                      <td>{r.juego}</td>
                      <td><span className={`status-chip ${statusClass[r.estado] ?? ""}`}>{statusLabel[r.estado] ?? r.estado}</span></td>
                      <td>{r.inscritos}</td>
                      <td>{r.max_participantes}</td>
                      <td>
                        <div className="pct-cell">
                          <div className="pct-bar">
                            <div className={`pct-fill ${r.porcentaje_llenado>=90?"pct-danger":r.porcentaje_llenado>=60?"pct-warn":"pct-ok"}`}
                              style={{width:`${Math.min(r.porcentaje_llenado,100)}%`}}/>
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
              <p className="section-desc">Torneos activos con cupos disponibles.</p>
            </div>
            <div className="report-controls">
              <input className="report-search" placeholder="🔍 Buscar por nombre o juego..." value={cuSearch} onChange={e => setCuSearch(e.target.value)} />
              <select className="report-sort" value={cuSort} onChange={e => setCuSort(e.target.value as any)}>
                <option value="nombre">Orden alfabético</option>
                <option value="max_asc">Máx. jugadores (menor primero)</option>
                <option value="max_desc">Máx. jugadores (mayor primero)</option>
              </select>
              <span className="report-count">{filteredCupos.length} torneo{filteredCupos.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="table-wrapper">
              {filteredCupos.length === 0 && <p className="empty-state">Sin resultados o todos los torneos están llenos.</p>}
              {filteredCupos.length > 0 && (
                <table className="admin-table">
                  <thead><tr><th>Torneo</th><th>Juego</th><th>Estado</th><th>Inscritos</th><th>Máximo</th><th>Cupos Libres</th><th>% Ocupado</th></tr></thead>
                  <tbody>
                    {filteredCupos.map(r => (
                      <tr key={r.id}>
                        <td className="td-name">{r.nombre}</td>
                        <td>{r.juego}</td>
                        <td><span className={`status-chip ${statusClass[r.estado]??""}`}>{statusLabel[r.estado]??r.estado}</span></td>
                        <td>{r.inscritos}</td>
                        <td>{r.max_participantes}</td>
                        <td><span className="metric metric-inscritos">{r.cupos_disponibles}</span></td>
                        <td>
                          <div className="pct-cell">
                            <div className="pct-bar">
                              <div className={`pct-fill ${(r.inscritos/r.max_participantes*100)>=90?'pct-danger':(r.inscritos/r.max_participantes*100)>=60?'pct-warn':'pct-ok'}`}
                                style={{width:`${Math.min((r.inscritos/r.max_participantes)*100,100)}%`}}/>
                            </div>
                            <span className="pct-label">{Math.round((r.inscritos/r.max_participantes)*100)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
        <div className="modal-overlay" onClick={() => { setDeleteConfirm(null); setDeleteMotivo(""); setDeleteType("logico"); }}>
          <div className="modal-box confirm-box" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">🗑️</div>
            <h2>¿Eliminar este torneo?</h2>

            {/* Tipo de eliminación */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px", justifyContent: "center" }}>
              <button
                onClick={() => setDeleteType("logico")}
                style={{ padding: "8px 18px", borderRadius: "8px", border: "2px solid", borderColor: deleteType === "logico" ? "#f59e0b" : "#334155", background: deleteType === "logico" ? "rgba(245,158,11,0.15)" : "transparent", color: deleteType === "logico" ? "#f59e0b" : "#94a3b8", cursor: "pointer", fontWeight: 600 }}
              >
                Baja Lógica
              </button>
              <button
                onClick={() => setDeleteType("real")}
                style={{ padding: "8px 18px", borderRadius: "8px", border: "2px solid", borderColor: deleteType === "real" ? "#ef4444" : "#334155", background: deleteType === "real" ? "rgba(239,68,68,0.15)" : "transparent", color: deleteType === "real" ? "#ef4444" : "#94a3b8", cursor: "pointer", fontWeight: 600 }}
              >
                Eliminación Real
              </button>
            </div>

            <p style={{ color: "#94a3b8", marginBottom: "12px", fontSize: "0.9rem" }}>
              {deleteType === "real"
                ? "⚠️ El torneo y todos sus datos (partidas, inscripciones) serán eliminados PERMANENTEMENTE."
                : "El torneo será marcado como eliminado pero permanecerá en la base de datos."}
            </p>

            {deleteType === "logico" && (
              <div className="mf-group" style={{ textAlign: "left", marginBottom: "16px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                  Motivo <span style={{ color: "#475569", fontWeight: 400 }}>(opcional)</span>
                </label>
                <textarea
                  value={deleteMotivo}
                  onChange={e => setDeleteMotivo(e.target.value)}
                  placeholder="Ej: Torneo duplicado, sin participantes suficientes..."
                  rows={3}
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", color: "#e2e8f0", padding: "10px 14px", fontSize: "0.88rem", fontFamily: "Inter, sans-serif", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => { setDeleteConfirm(null); setDeleteMotivo(""); setDeleteType("logico"); }}>Cancelar</button>
              <button
                className="btn-delete-confirm"
                style={{ background: deleteType === "real" ? "#dc2626" : undefined }}
                onClick={() => handleDelete(deleteConfirm)}
                disabled={loading}
              >
                {loading ? "Eliminando..." : deleteType === "real" ? "⚠️ Eliminar permanentemente" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default AdminDashboard;
