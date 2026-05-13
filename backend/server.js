import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { QueryTypes } from "sequelize";

dotenv.config();

import logger from "./utils/logger.js";
import sequelize from "./config/database.js";
import Usuario from "./models/Usuario.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "bracketcore_secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

// ─── Passport serialización ───────────────────────────────────────────────────
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ─── Google Strategy ─────────────────────────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3001/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    let usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) {
      const baseUsername = profile.displayName.replace(/\s/g, "_").toLowerCase();
      let username = baseUsername.substring(0, 30);
      const existing = await Usuario.findOne({ where: { username } });
      if (existing) username = username + "_" + Date.now().toString().slice(-4);
      usuario = await Usuario.create({
        username,
        email,
        avatar_url: profile.photos[0]?.value,
        oauth_provider: "google"
      });
      logger.info(`OAuth Google: nuevo usuario creado — ${email}`);
    } else {
      logger.info(`OAuth Google: login exitoso — ${email}`);
    }
    const { password: _, ...userData } = usuario.toJSON();
    return done(null, userData);
  } catch (err) {
    logger.error("OAuth Google error:", err);
    return done(err);
  }
}));

// ─── GitHub Strategy ─────────────────────────────────────────────────────────
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "http://localhost:3001/auth/github/callback",
  scope: ["user:email"]
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
    let usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) {
      let username = (profile.username || profile.id).substring(0, 30);
      const existing = await Usuario.findOne({ where: { username } });
      if (existing) username = username + "_" + Date.now().toString().slice(-4);
      usuario = await Usuario.create({
        username,
        email,
        avatar_url: profile.photos[0]?.value,
        oauth_provider: "github"
      });
      logger.info(`OAuth GitHub: nuevo usuario creado — ${email}`);
    } else {
      logger.info(`OAuth GitHub: login exitoso — ${email}`);
    }
    const { password: _, ...userData } = usuario.toJSON();
    return done(null, userData);
  } catch (err) {
    logger.error("OAuth GitHub error:", err);
    return done(err);
  }
}));

// ─── Conexión a la base de datos con Sequelize ───────────────────────────────
(async () => {
  try {
    logger.info("Iniciando conexión a la base de datos...");
    await sequelize.authenticate();
    logger.info("Conexión a MySQL establecida correctamente via Sequelize.");
  } catch (error) {
    logger.error("No se pudo conectar a la base de datos:", error);
    process.exit(1);
  }
})();

// ═══════════════════════════════════════════════════════════════════════════════
// USUARIOS
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/usuarios", async (req, res) => {
  logger.info("GET /usuarios — Solicitud recibida");
  try {
    const usuarios = await Usuario.findAll({ attributes: { exclude: ["password"] } });
    logger.info(`GET /usuarios — Retornando ${usuarios.length} usuarios`);
    res.json(usuarios);
  } catch (error) {
    logger.error("GET /usuarios — Error:", error);
    res.status(500).json({ error: "Error al obtener los usuarios" });
  }
});

app.get("/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  logger.info(`GET /usuarios/${id} — Solicitud recibida`);
  try {
    const usuario = await Usuario.findByPk(id, { attributes: { exclude: ["password"] } });
    if (!usuario) {
      logger.warn(`GET /usuarios/${id} — Usuario no encontrado`);
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    logger.info(`GET /usuarios/${id} — Usuario encontrado: ${usuario.username}`);
    res.json(usuario);
  } catch (error) {
    logger.error(`GET /usuarios/${id} — Error:`, error);
    res.status(500).json({ error: "Error al obtener el usuario" });
  }
});

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  logger.info(`POST /register — Intento de registro: ${email}`);

  if (!username || !email || !password) {
    logger.warn("POST /register — Campos incompletos");
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }

  try {
    const existente = await Usuario.findOne({ where: { email } });
    const existenteUsername = await Usuario.findOne({ where: { username } });

    if (existente || existenteUsername) {
      logger.warn(`POST /register — Email o username ya en uso: ${email} / ${username}`);
      return res.status(409).json({ error: "El email o nombre de usuario ya está en uso" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const nuevoUsuario = await Usuario.create({ username, email, password: hashedPassword });

    logger.info(`POST /register — Usuario creado: ID ${nuevoUsuario.id} (${email})`);
    res.status(201).json({ message: "Usuario creado exitosamente", userId: nuevoUsuario.id });
  } catch (error) {
    logger.error("POST /register — Error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  logger.info(`POST /login — Intento de login: ${email}`);

  if (!email || !password) {
    logger.warn("POST /login — Faltan credenciales");
    return res.status(400).json({ error: "Email y contraseña son requeridos" });
  }

  try {
    const usuario = await Usuario.findOne({ where: { email } });

    if (!usuario) {
      logger.warn(`POST /login — Email no encontrado: ${email}`);
      return res.status(401).json({ error: "Email o contraseña incorrectos" });
    }

    if (!usuario.password) {
      logger.warn(`POST /login — Usuario OAuth intentó login con contraseña: ${email}`);
      return res.status(401).json({ error: "Esta cuenta usa inicio de sesión social" });
    }

    const passwordMatch = await bcrypt.compare(password, usuario.password);

    if (!passwordMatch) {
      logger.warn(`POST /login — Contraseña incorrecta para: ${email}`);
      return res.status(401).json({ error: "Email o contraseña incorrectos" });
    }

    const { password: _, ...userWithoutPassword } = usuario.toJSON();
    logger.info(`POST /login — Login exitoso: ${email} (ID: ${usuario.id})`);
    res.json({ message: "Login exitoso", user: userWithoutPassword });
  } catch (error) {
    logger.error("POST /login — Error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.put("/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  const { username, email, password } = req.body;
  logger.info(`PUT /usuarios/${id} — Solicitud de actualización`);

  try {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      logger.warn(`PUT /usuarios/${id} — Usuario no encontrado`);
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const updateData = { username, email, password: undefined };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
      logger.info(`PUT /usuarios/${id} — Contraseña actualizada`);
    }

    await usuario.update(updateData);
    logger.info(`PUT /usuarios/${id} — Usuario actualizado correctamente`);
    const { password: _, ...updatedUser } = usuario.toJSON();
    res.json({ message: "Usuario actualizado", user: updatedUser });
  } catch (error) {
    logger.error(`PUT /usuarios/${id} — Error:`, error);
    res.status(500).json({ error: "Error al actualizar el usuario" });
  }
});

app.delete("/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  logger.info(`DELETE /usuarios/${id} — Solicitud de eliminación`);

  try {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      logger.warn(`DELETE /usuarios/${id} — Usuario no encontrado`);
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    await usuario.destroy();
    logger.info(`DELETE /usuarios/${id} — Usuario eliminado`);
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    logger.error(`DELETE /usuarios/${id} — Error:`, error);
    res.status(500).json({ error: "Error al eliminar el usuario" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TORNEOS
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/torneos", async (req, res) => {
  logger.info("GET /torneos — Solicitud recibida");
  try {
    const results = await sequelize.query(`
      SELECT t.id, t.nombre as name, v.nombre_juego as game,
        t.fecha_inicio as startDate, t.fecha_fin as endDate,
        t.max_participantes as players, t.estado as status,
        t.descripcion as description, t.formato as type,
        t.creado_por as createdBy, t.premio as prize, t.reglas as rules,
        t.bracket_iniciado as bracketIniciado,
        COUNT(i.id) as registeredPlayers
      FROM Torneos t
      LEFT JOIN Videojuegos v ON t.juego_id = v.id
      LEFT JOIN Inscripciones i ON t.id = i.torneo_id AND i.estatus_aprobacion = 'aprobado'
      WHERE t.estado != 'eliminado'
      GROUP BY t.id ORDER BY t.fecha_inicio DESC
    `, { type: QueryTypes.SELECT });
    logger.info(`GET /torneos — Retornando ${results.length} torneos`);
    res.json(results.map(t => ({ ...t, registeredPlayers: parseInt(t.registeredPlayers) || 0, players: parseInt(t.players) || 0 })));
  } catch (error) {
    logger.error("GET /torneos — Error:", error);
    res.status(500).json({ error: "Error al obtener torneos" });
  }
});

app.get("/torneos/usuario/:userId", async (req, res) => {
  const { userId } = req.params;
  logger.info(`GET /torneos/usuario/${userId} — Solicitud recibida`);
  try {
    const results = await sequelize.query(`
      SELECT t.id, t.nombre as name, v.nombre_juego as game,
        t.fecha_inicio as startDate, t.fecha_fin as endDate,
        t.max_participantes as players, t.estado as status,
        t.descripcion as description, t.formato as type,
        t.premio as prize, t.reglas as rules, t.bracket_iniciado as bracketIniciado,
        COUNT(i.id) as registeredPlayers
      FROM Torneos t
      LEFT JOIN Videojuegos v ON t.juego_id = v.id
      LEFT JOIN Inscripciones i ON t.id = i.torneo_id AND i.estatus_aprobacion = 'aprobado'
      WHERE t.creado_por = :userId
      GROUP BY t.id ORDER BY t.fecha_inicio DESC
    `, { replacements: { userId }, type: QueryTypes.SELECT });
    res.json(results.map(t => ({ ...t, registeredPlayers: parseInt(t.registeredPlayers) || 0, players: parseInt(t.players) || 0 })));
  } catch (error) {
    logger.error(`GET /torneos/usuario/${userId} — Error:`, error);
    res.status(500).json({ error: "Error al obtener torneos" });
  }
});

app.get("/torneos/:id", async (req, res) => {
  const { id } = req.params;
  logger.info(`GET /torneos/${id} — Solicitud recibida`);
  try {
    const results = await sequelize.query(`
      SELECT t.id, t.nombre as name, v.nombre_juego as game,
        t.fecha_inicio as startDate, t.fecha_fin as endDate,
        t.max_participantes as players, t.estado as status,
        t.descripcion as description, t.formato as type,
        t.creado_por as createdBy, t.premio as prize, t.reglas as rules,
        t.juego_id as gameId, t.bracket_iniciado as bracketIniciado,
        ug.username as ganadorNombre, t.ganador_id as ganadorId,
        COUNT(i.id) as registeredPlayers
      FROM Torneos t
      LEFT JOIN Videojuegos v ON t.juego_id = v.id
      LEFT JOIN Inscripciones i ON t.id = i.torneo_id AND i.estatus_aprobacion = 'aprobado'
      LEFT JOIN Usuarios ug ON t.ganador_id = ug.id
      WHERE t.id = :id GROUP BY t.id
    `, { replacements: { id }, type: QueryTypes.SELECT });

    if (results.length === 0) {
      logger.warn(`GET /torneos/${id} — Torneo no encontrado`);
      return res.status(404).json({ error: "Torneo no encontrado" });
    }
    const tournament = { ...results[0], registeredPlayers: parseInt(results[0].registeredPlayers) || 0 };
    logger.info(`GET /torneos/${id} — Torneo encontrado: ${tournament.name}`);
    res.json(tournament);
  } catch (error) {
    logger.error(`GET /torneos/${id} — Error:`, error);
    res.status(500).json({ error: "Error al obtener el torneo" });
  }
});

app.post("/torneos", async (req, res) => {
  const { nombre, juego_id, fecha_inicio, fecha_fin, max_participantes, descripcion, formato, premio, reglas, creado_por } = req.body;
  logger.info(`POST /torneos — Crear torneo: ${nombre}`);

  if (!nombre || !juego_id || !fecha_inicio || !fecha_fin || !max_participantes || !creado_por) {
    logger.warn("POST /torneos — Faltan campos requeridos");
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  try {
    const [result] = await sequelize.query(`
      INSERT INTO Torneos (nombre, juego_id, fecha_inicio, fecha_fin, max_participantes, descripcion, estado, formato, premio, reglas, creado_por)
      VALUES (:nombre, :juego_id, :fecha_inicio, :fecha_fin, :max_participantes, :descripcion, 'abierto', :formato, :premio, :reglas, :creado_por)
    `, { replacements: { nombre, juego_id, fecha_inicio, fecha_fin, max_participantes, descripcion, formato, premio, reglas, creado_por }, type: QueryTypes.INSERT });
    logger.info(`POST /torneos — Torneo creado: ID ${result}`);
    res.status(201).json({ message: "Torneo creado exitosamente", tournamentId: result });
  } catch (error) {
    logger.error("POST /torneos — Error:", error);
    res.status(500).json({ error: "Error al crear el torneo" });
  }
});

app.put("/torneos/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, juego_id, fecha_inicio, fecha_fin, max_participantes, descripcion, estado, formato, premio, reglas, creado_por, isAdmin } = req.body;
  logger.info(`PUT /torneos/${id} — Actualizar torneo`);

  try {
    const [check] = await sequelize.query("SELECT creado_por, bracket_iniciado, estado FROM Torneos WHERE id = :id", { replacements: { id }, type: QueryTypes.SELECT });
    if (!check) return res.status(404).json({ error: "Torneo no encontrado" });
    if (!isAdmin && check.creado_por !== creado_por) return res.status(403).json({ error: "No tienes permiso para editar este torneo" });
    // Only block users; admins can edit anytime
    if (!isAdmin && check.bracket_iniciado && check.estado !== 'finalizado') {
      return res.status(400).json({ error: "No puedes modificar un torneo en curso hasta que haya finalizado" });
    }

    await sequelize.query(`
      UPDATE Torneos SET nombre=:nombre, juego_id=:juego_id, fecha_inicio=:fecha_inicio,
        fecha_fin=:fecha_fin, max_participantes=:max_participantes, descripcion=:descripcion,
        estado=:estado, formato=:formato, premio=:premio, reglas=:reglas WHERE id=:id
    `, { replacements: { nombre, juego_id, fecha_inicio, fecha_fin, max_participantes, descripcion, estado, formato, premio, reglas, id }, type: QueryTypes.UPDATE });

    logger.info(`PUT /torneos/${id} — Torneo actualizado`);
    res.json({ message: "Torneo actualizado exitosamente" });
  } catch (error) {
    logger.error(`PUT /torneos/${id} — Error:`, error);
    res.status(500).json({ error: "Error al actualizar el torneo" });
  }
});

app.delete("/torneos/:id", async (req, res) => {
  const { id } = req.params;
  const { creado_por, motivo, isAdmin } = req.body;
  logger.info(`DELETE /torneos/${id} — Solicitud de eliminación lógica`);

  try {
    const [check] = await sequelize.query("SELECT creado_por, bracket_iniciado, estado FROM Torneos WHERE id = :id", { replacements: { id }, type: QueryTypes.SELECT });
    if (!check) return res.status(404).json({ error: "Torneo no encontrado" });
    if (!isAdmin && check.creado_por !== creado_por) return res.status(403).json({ error: "No tienes permiso para eliminar este torneo" });
    // Only block users; admins can delete anytime
    if (!isAdmin && check.bracket_iniciado && check.estado !== 'finalizado') {
      return res.status(400).json({ error: "No puedes eliminar un torneo en curso hasta que haya finalizado" });
    }

    // Logical delete for regular users; admin may also use this for logical delete
    await sequelize.query(
      "UPDATE Torneos SET estado = 'eliminado', motivo_eliminacion = :motivo WHERE id = :id",
      { replacements: { id, motivo: motivo || null }, type: QueryTypes.UPDATE }
    );
    logger.info(`DELETE /torneos/${id} — Torneo eliminado lógicamente`);
    res.json({ message: "Torneo eliminado" });
  } catch (error) {
    logger.error(`DELETE /torneos/${id} — Error:`, error);
    res.status(500).json({ error: "Error al eliminar el torneo" });
  }
});

app.put("/torneos/:id/finalizar", async (req, res) => {
  const { id } = req.params;
  const { usuario_id, role } = req.body;
  logger.info(`PUT /torneos/${id}/finalizar — Finalizar torneo manualmente`);

  try {
    const [check] = await sequelize.query("SELECT creado_por, estado FROM Torneos WHERE id = :id", { replacements: { id }, type: QueryTypes.SELECT });
    if (!check) return res.status(404).json({ error: "Torneo no encontrado" });

    if (check.creado_por !== parseInt(usuario_id) && role !== 'admin') {
      return res.status(403).json({ error: "No tienes permiso para finalizar este torneo" });
    }
    if (check.estado === 'finalizado') {
      return res.status(400).json({ error: "El torneo ya está finalizado" });
    }

    // Find the champion: the winner of the last confirmed match (highest round, pos 0)
    const [champion] = await sequelize.query(`
      SELECT p.ganador_id, u.username as ganador_nombre
      FROM Partidas p
      LEFT JOIN Usuarios u ON p.ganador_id = u.id
      WHERE p.torneo_id = :id AND p.estado = 'confirmado' AND p.es_bye = 0
      ORDER BY p.ronda DESC, p.bracket_pos ASC
      LIMIT 1
    `, { replacements: { id }, type: QueryTypes.SELECT });

    // Also try bye-champion (bracket of 1 confirmed match at highest round)
    const [byeChamp] = !champion?.ganador_id ? await sequelize.query(`
      SELECT p.ganador_id, u.username as ganador_nombre
      FROM Partidas p
      LEFT JOIN Usuarios u ON p.ganador_id = u.id
      WHERE p.torneo_id = :id AND p.estado = 'confirmado'
      ORDER BY p.ronda DESC LIMIT 1
    `, { replacements: { id }, type: QueryTypes.SELECT }) : [null];

    const finalChampion = champion?.ganador_id ? champion : byeChamp;

    await sequelize.query(
      "UPDATE Torneos SET estado = 'finalizado', ganador_id = :gid WHERE id = :id",
      { replacements: { id, gid: finalChampion?.ganador_id || null }, type: QueryTypes.UPDATE }
    );
    logger.info(`PUT /torneos/${id}/finalizar — Torneo finalizado. Campeón: ${finalChampion?.ganador_nombre}`);
    res.json({ message: "Torneo finalizado exitosamente", champion: finalChampion || null });
  } catch (error) {
    logger.error(`PUT /torneos/${id}/finalizar — Error:`, error);
    res.status(500).json({ error: "Error al finalizar el torneo" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════════════

// ── Reporte 1: Popularidad de Juegos ─────────────────────────────────────────
app.get("/admin/reportes/popularidad-juegos", async (req, res) => {
  logger.info("GET /admin/reportes/popularidad-juegos");
  try {
    const results = await sequelize.query(`
      SELECT v.id, v.nombre_juego as juego, v.genero, v.plataforma,
        COUNT(DISTINCT t.id) as total_torneos,
        COUNT(DISTINCT i.id) as total_inscritos
      FROM Videojuegos v
      LEFT JOIN Torneos t ON v.id = t.juego_id AND t.estado != 'eliminado'
      LEFT JOIN Inscripciones i ON t.id = i.torneo_id
      GROUP BY v.id, v.nombre_juego, v.genero, v.plataforma
      ORDER BY total_torneos DESC, total_inscritos DESC
    `, { type: QueryTypes.SELECT });
    res.json(results.map(r => ({ ...r, total_torneos: parseInt(r.total_torneos) || 0, total_inscritos: parseInt(r.total_inscritos) || 0 })));
  } catch (error) {
    logger.error("Reporte popularidad-juegos — Error:", error);
    res.status(500).json({ error: "Error al generar reporte" });
  }
});

// ── Reporte 2: Ranking de Jugadores ──────────────────────────────────────────
app.get("/admin/reportes/ranking-jugadores", async (req, res) => {
  logger.info("GET /admin/reportes/ranking-jugadores");
  try {
    const results = await sequelize.query(`
      SELECT u.id, u.username, u.email, u.role,
        COUNT(DISTINCT CASE WHEN p.ganador_id = u.id AND p.es_bye = 0 AND p.estado = 'confirmado' THEN p.id END) as victorias,
        COUNT(DISTINCT i.torneo_id) as torneos_participados
      FROM Usuarios u
      LEFT JOIN Partidas p ON (u.id = p.jugador1_id OR u.id = p.jugador2_id)
      LEFT JOIN Inscripciones i ON u.id = i.usuario_id AND i.estatus_aprobacion = 'aprobado'
      WHERE EXISTS (SELECT 1 FROM Inscripciones ins WHERE ins.usuario_id = u.id AND ins.estatus_aprobacion = 'aprobado')
      GROUP BY u.id, u.username, u.email, u.role
      ORDER BY victorias DESC, torneos_participados DESC
    `, { type: QueryTypes.SELECT });
    res.json(results.map(r => ({ ...r, victorias: parseInt(r.victorias) || 0, torneos_participados: parseInt(r.torneos_participados) || 0 })));
  } catch (error) {
    logger.error("Reporte ranking-jugadores — Error:", error);
    res.status(500).json({ error: "Error al generar reporte" });
  }
});

// ── Reporte 3: Ocupación de Torneos ──────────────────────────────────────────
app.get("/admin/reportes/ocupacion-torneos", async (req, res) => {
  logger.info("GET /admin/reportes/ocupacion-torneos");
  try {
    const results = await sequelize.query(`
      SELECT t.id, t.nombre, v.nombre_juego as juego, t.estado,
        t.max_participantes,
        COUNT(i.id) as inscritos,
        ROUND((COUNT(i.id) / t.max_participantes) * 100, 1) as porcentaje_llenado
      FROM Torneos t
      LEFT JOIN Videojuegos v ON t.juego_id = v.id
      LEFT JOIN Inscripciones i ON t.id = i.torneo_id AND i.estatus_aprobacion = 'aprobado'
      GROUP BY t.id, t.nombre, v.nombre_juego, t.estado, t.max_participantes
      ORDER BY porcentaje_llenado DESC
    `, { type: QueryTypes.SELECT });
    res.json(results.map(r => ({
      ...r,
      max_participantes: parseInt(r.max_participantes) || 0,
      inscritos: parseInt(r.inscritos) || 0,
      porcentaje_llenado: parseFloat(r.porcentaje_llenado) || 0
    })));
  } catch (error) {
    logger.error("Reporte ocupacion-torneos — Error:", error);
    res.status(500).json({ error: "Error al generar reporte" });
  }
});

// ── Reporte 4: Disponibilidad de Cupos ───────────────────────────────────────
app.get("/admin/reportes/disponibilidad-cupos", async (req, res) => {
  logger.info("GET /admin/reportes/disponibilidad-cupos");
  try {
    const results = await sequelize.query(`
      SELECT t.id, t.nombre, v.nombre_juego as juego, t.estado,
        t.max_participantes,
        COUNT(i.id) as inscritos,
        (t.max_participantes - COUNT(i.id)) as cupos_disponibles
      FROM Torneos t
      LEFT JOIN Videojuegos v ON t.juego_id = v.id
      LEFT JOIN Inscripciones i ON t.id = i.torneo_id AND i.estatus_aprobacion = 'aprobado'
      WHERE t.estado IN ('abierto', 'en curso')
      GROUP BY t.id, t.nombre, v.nombre_juego, t.estado, t.max_participantes
      ORDER BY cupos_disponibles ASC
    `, { type: QueryTypes.SELECT });
    res.json(results.map(r => ({
      ...r,
      max_participantes: parseInt(r.max_participantes) || 0,
      inscritos: parseInt(r.inscritos) || 0,
      cupos_disponibles: parseInt(r.cupos_disponibles) || 0
    })));
  } catch (error) {
    logger.error("Reporte disponibilidad-cupos — Error:", error);
    res.status(500).json({ error: "Error al generar reporte" });
  }
});

// ── Reporte 5: Campeones ────────────────────────────────────────────────────
app.get("/admin/reportes/campeones", async (req, res) => {
  logger.info("GET /admin/reportes/campeones");
  try {
    const results = await sequelize.query(`
      SELECT
        u.id,
        u.username,
        u.email,
        -- Torneos ganados: torneos donde este usuario es el ganador_id registrado
        COUNT(DISTINCT t_ganados.id) AS torneos_ganados,
        -- Partidas jugadas (como jugador1 o jugador2, no byes, confirmadas)
        COUNT(DISTINCT CASE WHEN (p.jugador1_id = u.id OR p.jugador2_id = u.id)
          AND p.es_bye = 0 AND p.estado = 'confirmado' THEN p.id END) AS partidas_jugadas,
        -- Partidas ganadas
        COUNT(DISTINCT CASE WHEN p.ganador_id = u.id AND p.es_bye = 0
          AND p.estado = 'confirmado' THEN p.id END) AS partidas_ganadas,
        -- Partidas perdidas
        COUNT(DISTINCT CASE WHEN (p.jugador1_id = u.id OR p.jugador2_id = u.id)
          AND p.ganador_id IS NOT NULL AND p.ganador_id != u.id
          AND p.es_bye = 0 AND p.estado = 'confirmado' THEN p.id END) AS partidas_perdidas
      FROM Usuarios u
      LEFT JOIN Torneos t_ganados ON t_ganados.ganador_id = u.id AND t_ganados.estado = 'finalizado'
      LEFT JOIN Partidas p ON (p.jugador1_id = u.id OR p.jugador2_id = u.id)
      WHERE EXISTS (
        SELECT 1 FROM Inscripciones ins
        WHERE ins.usuario_id = u.id AND ins.estatus_aprobacion = 'aprobado'
      )
      GROUP BY u.id, u.username, u.email
      HAVING partidas_jugadas > 0 OR torneos_ganados > 0
      ORDER BY torneos_ganados DESC, partidas_ganadas DESC
    `, { type: QueryTypes.SELECT });
    res.json(results.map(r => {
      const jugadas = parseInt(r.partidas_jugadas) || 0;
      const ganadas = parseInt(r.partidas_ganadas) || 0;
      const perdidas = parseInt(r.partidas_perdidas) || 0;
      return {
        ...r,
        torneos_ganados: parseInt(r.torneos_ganados) || 0,
        partidas_jugadas: jugadas,
        partidas_ganadas: ganadas,
        partidas_perdidas: perdidas,
        pct_victorias: jugadas > 0 ? Math.round((ganadas / jugadas) * 100) : 0,
        pct_derrotas: jugadas > 0 ? Math.round((perdidas / jugadas) * 100) : 0,
      };
    }));
  } catch (error) {
    logger.error("Reporte campeones — Error:", error);
    res.status(500).json({ error: "Error al generar reporte" });
  }
});

// ── Admin: Editar cualquier torneo ───────────────────────────────────────────
app.put("/admin/torneos/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, juego_id, fecha_inicio, fecha_fin, max_participantes, descripcion, estado, formato, premio, reglas } = req.body;
  logger.info(`PUT /admin/torneos/${id} — Edición de admin`);
  try {
    const [check] = await sequelize.query("SELECT id FROM Torneos WHERE id = :id", { replacements: { id }, type: QueryTypes.SELECT });
    if (!check) return res.status(404).json({ error: "Torneo no encontrado" });
    // Admin can edit any tournament regardless of bracket status

    await sequelize.query(`
      UPDATE Torneos SET nombre=:nombre, juego_id=:juego_id, fecha_inicio=:fecha_inicio,
        fecha_fin=:fecha_fin, max_participantes=:max_participantes, descripcion=:descripcion,
        estado=:estado, formato=:formato, premio=:premio, reglas=:reglas WHERE id=:id
    `, { replacements: { nombre, juego_id, fecha_inicio, fecha_fin, max_participantes, descripcion, estado, formato, premio, reglas, id }, type: QueryTypes.UPDATE });

    logger.info(`PUT /admin/torneos/${id} — Torneo actualizado por admin`);
    res.json({ message: "Torneo actualizado exitosamente" });
  } catch (error) {
    logger.error(`PUT /admin/torneos/${id} — Error:`, error);
    res.status(500).json({ error: "Error al actualizar el torneo" });
  }
});

// ── Admin: Eliminación lógica de torneo (con motivo) ────────────────────────
app.delete("/admin/torneos/:id/logico", async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  logger.info(`DELETE /admin/torneos/${id}/logico — Eliminación lógica`);
  try {
    const [check] = await sequelize.query("SELECT id, bracket_iniciado, estado FROM Torneos WHERE id = :id", { replacements: { id }, type: QueryTypes.SELECT });
    if (!check) return res.status(404).json({ error: "Torneo no encontrado" });
    if (check.bracket_iniciado && check.estado !== 'finalizado') {
      return res.status(400).json({ error: "No puedes eliminar un torneo en curso hasta que haya finalizado" });
    }
    await sequelize.query(
      "UPDATE Torneos SET estado = 'eliminado', motivo_eliminacion = :motivo WHERE id = :id",
      { replacements: { id, motivo: motivo || null }, type: QueryTypes.UPDATE }
    );
    logger.info(`DELETE /admin/torneos/${id}/logico — Torneo eliminado lógicamente. Motivo: ${motivo}`);
    res.json({ message: "Torneo eliminado lógicamente" });
  } catch (error) {
    logger.error(`DELETE /admin/torneos/${id}/logico — Error:`, error);
    res.status(500).json({ error: "Error al eliminar el torneo" });
  }
});

// ── Admin: Eliminación real (física) de torneo ────────────────────────────────────────────
app.delete("/admin/torneos/:id/real", async (req, res) => {
  const { id } = req.params;
  logger.info(`DELETE /admin/torneos/${id}/real — Eliminación física`);
  try {
    const [check] = await sequelize.query("SELECT id, bracket_iniciado, estado FROM Torneos WHERE id = :id", { replacements: { id }, type: QueryTypes.SELECT });
    if (!check) return res.status(404).json({ error: "Torneo no encontrado" });
    if (check.bracket_iniciado && check.estado !== 'finalizado') {
      return res.status(400).json({ error: "No puedes eliminar un torneo en curso hasta que haya finalizado" });
    }
    await sequelize.query("DELETE FROM Partidas WHERE torneo_id = :id", { replacements: { id }, type: QueryTypes.DELETE });
    await sequelize.query("DELETE FROM Inscripciones WHERE torneo_id = :id", { replacements: { id }, type: QueryTypes.DELETE });
    await sequelize.query("DELETE FROM Torneos WHERE id = :id", { replacements: { id }, type: QueryTypes.DELETE });
    logger.info(`DELETE /admin/torneos/${id}/real — Torneo eliminado físicamente`);
    res.json({ message: "Torneo eliminado permanentemente" });
  } catch (error) {
    logger.error(`DELETE /admin/torneos/${id}/real — Error:`, error);
    res.status(500).json({ error: "Error al eliminar el torneo" });
  }
});

// ── Admin: Obtener todos los torneos (incluyendo eliminados) ─────────────────
app.get("/admin/torneos", async (req, res) => {
  logger.info("GET /admin/torneos — Solicitud de admin");
  try {
    const results = await sequelize.query(`
      SELECT t.id, t.nombre as name, v.nombre_juego as game,
        t.fecha_inicio as startDate, t.fecha_fin as endDate,
        t.max_participantes as players, t.estado as status,
        t.descripcion as description, t.formato as type,
        t.creado_por as createdBy, t.premio as prize, t.reglas as rules,
        t.juego_id as gameId, t.bracket_iniciado as bracketIniciado, COUNT(i.id) as registeredPlayers
      FROM Torneos t
      LEFT JOIN Videojuegos v ON t.juego_id = v.id
      LEFT JOIN Inscripciones i ON t.id = i.torneo_id AND i.estatus_aprobacion = 'aprobado'
      GROUP BY t.id ORDER BY t.fecha_inicio DESC
    `, { type: QueryTypes.SELECT });
    res.json(results.map(t => ({ ...t, registeredPlayers: parseInt(t.registeredPlayers) || 0, players: parseInt(t.players) || 0 })));
  } catch (error) {
    logger.error("GET /admin/torneos — Error:", error);
    res.status(500).json({ error: "Error al obtener torneos" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BRACKET
// ═══════════════════════════════════════════════════════════════════════════════

// Helper: advance winner to next round match
async function advanceWinner(torneo_id, ronda, bracket_pos, ganador_id) {
  const next_ronda = ronda + 1;
  const next_pos = Math.floor(bracket_pos / 2);
  const is_j1_slot = bracket_pos % 2 === 0;

  const [existing] = await sequelize.query(
    "SELECT id, jugador1_id, jugador2_id FROM Partidas WHERE torneo_id = :torneo_id AND ronda = :ronda AND bracket_pos = :pos",
    { replacements: { torneo_id, ronda: next_ronda, pos: next_pos }, type: QueryTypes.SELECT }
  );

  if (existing) {
    const field = is_j1_slot ? "jugador1_id" : "jugador2_id";
    await sequelize.query(
      `UPDATE Partidas SET ${field} = :ganador WHERE id = :id`,
      { replacements: { ganador: ganador_id, id: existing.id }, type: QueryTypes.UPDATE }
    );
    const j1 = is_j1_slot ? ganador_id : existing.jugador1_id;
    const j2 = is_j1_slot ? existing.jugador2_id : ganador_id;
    if (j1 && j2) {
      // Both players present → match is ready
      await sequelize.query(
        "UPDATE Partidas SET estado = 'pendiente' WHERE id = :id",
        { replacements: { id: existing.id }, type: QueryTypes.UPDATE }
      );
    } else {
      // Only one player in existing match → auto-advance as bye
      const soloPlayer = j1 || j2;
      await sequelize.query(
        "UPDATE Partidas SET ganador_id = :g, estado = 'confirmado', es_bye = 1 WHERE id = :id",
        { replacements: { g: soloPlayer, id: existing.id }, type: QueryTypes.UPDATE }
      );
      await advanceWinner(torneo_id, next_ronda, next_pos, soloPlayer);
    }
  } else {
    const j1 = is_j1_slot ? ganador_id : null;
    const j2 = is_j1_slot ? null : ganador_id;

    // Check if the sibling feeder match at CURRENT ronda exists.
    // Sibling feeds the OTHER slot of next_pos. If it doesn't exist,
    // no opponent will ever arrive → this player is the champion.
    const sibling_bracket_pos = bracket_pos % 2 === 0 ? bracket_pos + 1 : bracket_pos - 1;
    const [siblingMatch] = await sequelize.query(
      "SELECT id FROM Partidas WHERE torneo_id = :torneo_id AND ronda = :ronda AND bracket_pos = :pos",
      { replacements: { torneo_id, ronda, pos: sibling_bracket_pos }, type: QueryTypes.SELECT }
    );

    if (!siblingMatch) {
      // No sibling feeder → solo player is the champion → auto-confirm
      logger.info(`advanceWinner: no sibling at ronda ${ronda} pos ${sibling_bracket_pos} — ${ganador_id} es campeón`);
      await sequelize.query(
        "INSERT INTO Partidas (torneo_id, jugador1_id, jugador2_id, ronda, bracket_pos, estado, ganador_id, es_bye) VALUES (:torneo_id, :j1, :j2, :ronda, :pos, 'confirmado', :ganador, 1)",
        { replacements: { torneo_id, j1, j2, ronda: next_ronda, pos: next_pos, ganador: ganador_id }, type: QueryTypes.INSERT }
      );
    } else {
      // Sibling exists → opponent will arrive later → create waiting slot
      await sequelize.query(
        "INSERT INTO Partidas (torneo_id, jugador1_id, jugador2_id, ronda, bracket_pos, estado, es_bye) VALUES (:torneo_id, :j1, :j2, :ronda, :pos, 'esperando', 0)",
        { replacements: { torneo_id, j1, j2, ronda: next_ronda, pos: next_pos }, type: QueryTypes.INSERT }
      );
    }
  }
}

// ── Generar bracket ──────────────────────────────────────────────────────────
app.post("/torneos/:id/bracket/generar", async (req, res) => {
  const { id } = req.params;
  logger.info(`POST /torneos/${id}/bracket/generar`);
  try {
    const [torneo] = await sequelize.query(
      "SELECT id, creado_por, bracket_iniciado FROM Torneos WHERE id = :id",
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    if (!torneo) return res.status(404).json({ error: "Torneo no encontrado" });
    if (torneo.bracket_iniciado) return res.status(409).json({ error: "El bracket ya fue generado" });

    const inscritos = await sequelize.query(
      "SELECT usuario_id FROM Inscripciones WHERE torneo_id = :id AND estatus_aprobacion = 'aprobado' ORDER BY fecha_inscripcion ASC",
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    if (inscritos.length < 2) return res.status(400).json({ error: "Se necesitan al menos 2 jugadores inscritos" });

    // Shuffle
    const players = inscritos.map(i => i.usuario_id);
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }

    const nextPow2 = Math.pow(2, Math.ceil(Math.log2(Math.max(players.length, 2))));
    const slots = [...players, ...Array(nextPow2 - players.length).fill(null)];
    const r1Matches = nextPow2 / 2;

    // Pass 1: insert ALL round-1 matches first (so siblings exist in DB)
    const byesToProcess = [];
    for (let pos = 0; pos < r1Matches; pos++) {
      const j1 = slots[pos * 2];
      const j2 = slots[pos * 2 + 1];
      if (j1 === null && j2 === null) continue;
      if (j2 === null) {
        await sequelize.query(
          "INSERT INTO Partidas (torneo_id, jugador1_id, jugador2_id, ronda, bracket_pos, estado, ganador_id, es_bye) VALUES (:t, :j1, NULL, 1, :pos, 'confirmado', :j1, 1)",
          { replacements: { t: id, j1, pos }, type: QueryTypes.INSERT }
        );
        byesToProcess.push({ pos, winner: j1 });
      } else if (j1 === null) {
        await sequelize.query(
          "INSERT INTO Partidas (torneo_id, jugador1_id, jugador2_id, ronda, bracket_pos, estado, ganador_id, es_bye) VALUES (:t, NULL, :j2, 1, :pos, 'confirmado', :j2, 1)",
          { replacements: { t: id, j2, pos }, type: QueryTypes.INSERT }
        );
        byesToProcess.push({ pos, winner: j2 });
      } else {
        await sequelize.query(
          "INSERT INTO Partidas (torneo_id, jugador1_id, jugador2_id, ronda, bracket_pos, estado, es_bye) VALUES (:t, :j1, :j2, 1, :pos, 'pendiente', 0)",
          { replacements: { t: id, j1, j2, pos }, type: QueryTypes.INSERT }
        );
      }
    }
    // Pass 2: now advance BYE winners (sibling matches already exist in DB)
    for (const bye of byesToProcess) {
      await advanceWinner(id, 1, bye.pos, bye.winner);
    }

    await sequelize.query(
      "UPDATE Torneos SET bracket_iniciado = 1, estado = 'en curso' WHERE id = :id",
      { replacements: { id }, type: QueryTypes.UPDATE }
    );
    const totalRounds = Math.log2(nextPow2);
    logger.info(`Bracket generado: ${r1Matches} partidas, ${totalRounds} rondas`);
    res.json({ message: "Bracket generado", totalRounds, players: players.length });
  } catch (error) {
    logger.error(`POST /torneos/${id}/bracket/generar — Error:`, error);
    res.status(500).json({ error: "Error al generar el bracket" });
  }
});

// ── Resetear y regenerar bracket ─────────────────────────────────────────────
app.post("/torneos/:id/bracket/reset", async (req, res) => {
  const { id } = req.params;
  const { usuario_id } = req.body;
  logger.info(`POST /torneos/${id}/bracket/reset — Solicitud de reset`);
  try {
    const [torneo] = await sequelize.query(
      "SELECT id, creado_por, bracket_iniciado, estado FROM Torneos WHERE id = :id",
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    if (!torneo) return res.status(404).json({ error: "Torneo no encontrado" });
    if (torneo.estado === "finalizado") return res.status(400).json({ error: "No puedes reiniciar un torneo ya finalizado" });

    // Verificar permisos: solo el creador o admin
    const [decider] = await sequelize.query(
      "SELECT role FROM Usuarios WHERE id = :id",
      { replacements: { id: usuario_id }, type: QueryTypes.SELECT }
    );
    const isOrganizer = torneo.creado_por === parseInt(usuario_id);
    const isAdmin = decider?.role === "admin";
    if (!isOrganizer && !isAdmin) return res.status(403).json({ error: "Sin permisos para reiniciar el bracket" });

    // Eliminar todas las partidas existentes del torneo
    await sequelize.query("DELETE FROM Partidas WHERE torneo_id = :id", { replacements: { id }, type: QueryTypes.DELETE });

    // Resetear estado del torneo
    await sequelize.query(
      "UPDATE Torneos SET bracket_iniciado = 0, estado = 'en curso' WHERE id = :id",
      { replacements: { id }, type: QueryTypes.UPDATE }
    );

    // Re-obtener inscritos y generar nuevo bracket
    const inscritos = await sequelize.query(
      "SELECT usuario_id FROM Inscripciones WHERE torneo_id = :id AND estatus_aprobacion = 'aprobado' ORDER BY fecha_inscripcion ASC",
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    if (inscritos.length < 2) return res.status(400).json({ error: "Se necesitan al menos 2 jugadores inscritos" });

    const players = inscritos.map(i => i.usuario_id);
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }

    const nextPow2 = Math.pow(2, Math.ceil(Math.log2(Math.max(players.length, 2))));
    const slots = [...players, ...Array(nextPow2 - players.length).fill(null)];
    const r1Matches = nextPow2 / 2;

    // Pass 1: insert ALL round-1 matches first (so siblings exist in DB)
    const byesToProcess2 = [];
    for (let pos = 0; pos < r1Matches; pos++) {
      const j1 = slots[pos * 2];
      const j2 = slots[pos * 2 + 1];
      if (j1 === null && j2 === null) continue;
      if (j2 === null) {
        await sequelize.query(
          "INSERT INTO Partidas (torneo_id, jugador1_id, jugador2_id, ronda, bracket_pos, estado, ganador_id, es_bye) VALUES (:t, :j1, NULL, 1, :pos, 'confirmado', :j1, 1)",
          { replacements: { t: id, j1, pos }, type: QueryTypes.INSERT }
        );
        byesToProcess2.push({ pos, winner: j1 });
      } else if (j1 === null) {
        await sequelize.query(
          "INSERT INTO Partidas (torneo_id, jugador1_id, jugador2_id, ronda, bracket_pos, estado, ganador_id, es_bye) VALUES (:t, NULL, :j2, 1, :pos, 'confirmado', :j2, 1)",
          { replacements: { t: id, j2, pos }, type: QueryTypes.INSERT }
        );
        byesToProcess2.push({ pos, winner: j2 });
      } else {
        await sequelize.query(
          "INSERT INTO Partidas (torneo_id, jugador1_id, jugador2_id, ronda, bracket_pos, estado, es_bye) VALUES (:t, :j1, :j2, 1, :pos, 'pendiente', 0)",
          { replacements: { t: id, j1, j2, pos }, type: QueryTypes.INSERT }
        );
      }
    }
    // Pass 2: advance BYE winners (sibling matches already exist in DB)
    for (const bye of byesToProcess2) {
      await advanceWinner(id, 1, bye.pos, bye.winner);
    }

    await sequelize.query(
      "UPDATE Torneos SET bracket_iniciado = 1, estado = 'en curso' WHERE id = :id",
      { replacements: { id }, type: QueryTypes.UPDATE }
    );
    const totalRounds = Math.log2(nextPow2);
    logger.info(`Bracket reseteado y regenerado: ${players.length} jugadores, ${totalRounds} rondas`);
    res.json({ message: "Bracket reiniciado y regenerado", totalRounds, players: players.length });
  } catch (error) {
    logger.error(`POST /torneos/${id}/bracket/reset — Error:`, error);
    res.status(500).json({ error: "Error al reiniciar el bracket" });
  }
});

// ── Obtener bracket ──────────────────────────────────────────────────────────
app.get("/torneos/:id/bracket", async (req, res) => {
  const { id } = req.params;
  try {
    const matches = await sequelize.query(`
      SELECT p.id, p.torneo_id, p.ronda, p.bracket_pos, p.estado, p.es_bye,
        p.jugador1_id, u1.username as jugador1_nombre, u1.avatar_url as jugador1_avatar,
        p.jugador2_id, u2.username as jugador2_nombre, u2.avatar_url as jugador2_avatar,
        p.ganador_id, ug.username as ganador_nombre,
        p.reporte_j1, p.reporte_j2, p.resultado, p.fecha_partida
      FROM Partidas p
      LEFT JOIN Usuarios u1 ON p.jugador1_id = u1.id
      LEFT JOIN Usuarios u2 ON p.jugador2_id = u2.id
      LEFT JOIN Usuarios ug ON p.ganador_id = ug.id
      WHERE p.torneo_id = :id
      ORDER BY p.ronda ASC, p.bracket_pos ASC
    `, { replacements: { id }, type: QueryTypes.SELECT });

    const [torneo] = await sequelize.query(
      "SELECT id, nombre, creado_por, bracket_iniciado, max_participantes, estado FROM Torneos WHERE id = :id",
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    res.json({ torneo, matches });
  } catch (error) {
    logger.error(`GET /torneos/${id}/bracket — Error:`, error);
    res.status(500).json({ error: "Error al obtener el bracket" });
  }
});

// ── Jugador reporta ganador ──────────────────────────────────────────────────
app.put("/partidas/:id/reportar", async (req, res) => {
  const { id } = req.params;
  const { usuario_id, ganador_id } = req.body;
  try {
    const [match] = await sequelize.query(
      "SELECT id, torneo_id, jugador1_id, jugador2_id, ronda, bracket_pos, estado, reporte_j1, reporte_j2 FROM Partidas WHERE id = :id",
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    if (!match) return res.status(404).json({ error: "Partida no encontrada" });
    if (match.estado === 'confirmado') return res.status(400).json({ error: "Partida ya confirmada" });

    const isJ1 = match.jugador1_id === parseInt(usuario_id);
    const isJ2 = match.jugador2_id === parseInt(usuario_id);
    if (!isJ1 && !isJ2) return res.status(403).json({ error: "No eres jugador de esta partida" });

    const field = isJ1 ? "reporte_j1" : "reporte_j2";
    await sequelize.query(
      `UPDATE Partidas SET ${field} = :ganador, estado = 'en_disputa' WHERE id = :id`,
      { replacements: { ganador: ganador_id, id }, type: QueryTypes.UPDATE }
    );

    const r1 = isJ1 ? parseInt(ganador_id) : match.reporte_j1;
    const r2 = isJ2 ? parseInt(ganador_id) : match.reporte_j2;

    if (r1 && r2 && r1 === r2) {
      // Ambos coinciden → confirmar
      await sequelize.query(
        "UPDATE Partidas SET ganador_id = :g, estado = 'confirmado' WHERE id = :id",
        { replacements: { g: r1, id }, type: QueryTypes.UPDATE }
      );
      await advanceWinner(match.torneo_id, match.ronda, match.bracket_pos, r1);
      return res.json({ message: "Resultado confirmado automáticamente", ganador_id: r1 });
    }

    res.json({ message: "Reporte guardado. Esperando confirmación del otro jugador." });
  } catch (error) {
    logger.error(`PUT /partidas/${id}/reportar — Error:`, error);
    res.status(500).json({ error: "Error al reportar resultado" });
  }
});

// ── Organizador/admin decide ganador ─────────────────────────────────────────
app.put("/partidas/:id/decidir", async (req, res) => {
  const { id } = req.params;
  const { ganador_id, decidido_por } = req.body;
  try {
    const [match] = await sequelize.query(
      "SELECT id, torneo_id, jugador1_id, jugador2_id, ronda, bracket_pos, estado FROM Partidas WHERE id = :id",
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    if (!match) return res.status(404).json({ error: "Partida no encontrada" });
    if (match.estado === 'confirmado') return res.status(400).json({ error: "Partida ya confirmada" });

    const [torneo] = await sequelize.query(
      "SELECT creado_por FROM Torneos WHERE id = :id",
      { replacements: { id: match.torneo_id }, type: QueryTypes.SELECT }
    );
    const [decider] = await sequelize.query(
      "SELECT role FROM Usuarios WHERE id = :id",
      { replacements: { id: decidido_por }, type: QueryTypes.SELECT }
    );
    const isOrganizer = torneo?.creado_por === parseInt(decidido_por);
    const isAdmin = decider?.role === 'admin';
    if (!isOrganizer && !isAdmin) return res.status(403).json({ error: "Sin permisos para decidir" });

    await sequelize.query(
      "UPDATE Partidas SET ganador_id = :g, estado = 'confirmado' WHERE id = :id",
      { replacements: { g: ganador_id, id }, type: QueryTypes.UPDATE }
    );
    await advanceWinner(match.torneo_id, match.ronda, match.bracket_pos, parseInt(ganador_id));
    res.json({ message: "Ganador asignado", ganador_id });
  } catch (error) {
    logger.error(`PUT /partidas/${id}/decidir — Error:`, error);
    res.status(500).json({ error: "Error al decidir ganador" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEOJUEGOS
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/videojuegos", async (req, res) => {
  logger.info("GET /videojuegos — Solicitud recibida");
  try {
    const results = await sequelize.query("SELECT * FROM Videojuegos ORDER BY nombre_juego", { type: QueryTypes.SELECT });
    logger.info(`GET /videojuegos — Retornando ${results.length} juegos`);
    res.json(results);
  } catch (error) {
    logger.error("GET /videojuegos — Error:", error);
    res.status(500).json({ error: "Error al obtener videojuegos" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INSCRIPCIONES
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/inscripciones", async (req, res) => {
  const { usuario_id, torneo_id } = req.body;
  logger.info(`POST /inscripciones — Usuario ${usuario_id} en torneo ${torneo_id}`);

  try {
    const [torneo] = await sequelize.query(
      "SELECT max_participantes, estado, bracket_iniciado FROM Torneos WHERE id = :torneo_id",
      { replacements: { torneo_id }, type: QueryTypes.SELECT }
    );
    if (!torneo) return res.status(404).json({ error: "Torneo no encontrado" });

    // Bloquear si el bracket ya fue generado
    if (torneo.bracket_iniciado) {
      return res.status(400).json({ error: "El bracket ya fue iniciado. No se aceptan nuevas inscripciones." });
    }

    const [existing] = await sequelize.query(
      "SELECT id FROM Inscripciones WHERE usuario_id = :usuario_id AND torneo_id = :torneo_id",
      { replacements: { usuario_id, torneo_id }, type: QueryTypes.SELECT }
    );
    if (existing) return res.status(409).json({ error: "Ya estás inscrito en este torneo" });

    const [countResult] = await sequelize.query(
      "SELECT COUNT(*) as count FROM Inscripciones WHERE torneo_id = :torneo_id AND estatus_aprobacion = 'aprobado'",
      { replacements: { torneo_id }, type: QueryTypes.SELECT }
    );
    if (parseInt(countResult.count) >= torneo.max_participantes) {
      return res.status(400).json({ error: "El torneo ya está lleno" });
    }

    const [result] = await sequelize.query(
      "INSERT INTO Inscripciones (usuario_id, torneo_id, estatus_aprobacion) VALUES (:usuario_id, :torneo_id, 'aprobado')",
      { replacements: { usuario_id, torneo_id }, type: QueryTypes.INSERT }
    );
    logger.info(`POST /inscripciones — Inscripción exitosa: ID ${result}`);
    res.status(201).json({ message: "Inscripción exitosa", inscriptionId: result });
  } catch (error) {
    logger.error("POST /inscripciones — Error:", error);
    res.status(500).json({ error: "Error al inscribirse" });
  }
});

app.delete("/inscripciones/:torneo_id/:usuario_id", async (req, res) => {
  const { torneo_id, usuario_id } = req.params;
  logger.info(`DELETE /inscripciones/${torneo_id}/${usuario_id} — Cancelar inscripción`);

  try {
    await sequelize.query(
      "DELETE FROM Inscripciones WHERE torneo_id = :torneo_id AND usuario_id = :usuario_id",
      { replacements: { torneo_id, usuario_id }, type: QueryTypes.DELETE }
    );
    logger.info(`DELETE /inscripciones — Inscripción cancelada`);
    res.json({ message: "Inscripción cancelada exitosamente" });
  } catch (error) {
    logger.error("DELETE /inscripciones — Error:", error);
    res.status(500).json({ error: "Error al cancelar la inscripción" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// OAUTH
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: `${process.env.FRONTEND_URL}/oauth-callback?error=google_failed` }),
  (req, res) => {
    const encoded = encodeURIComponent(JSON.stringify(req.user));
    logger.info("OAuth Google callback exitoso");
    res.redirect(`${process.env.FRONTEND_URL}/oauth-callback?user=${encoded}`);
  }
);

app.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }));

app.get("/auth/github/callback",
  passport.authenticate("github", { failureRedirect: `${process.env.FRONTEND_URL}/oauth-callback?error=github_failed` }),
  (req, res) => {
    const encoded = encodeURIComponent(JSON.stringify(req.user));
    logger.info("OAuth GitHub callback exitoso");
    res.redirect(`${process.env.FRONTEND_URL}/oauth-callback?user=${encoded}`);
  }
);

// ─── Manejo de errores global ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`Error no manejado en ${req.method} ${req.path}:`, err);
  res.status(500).json({ error: "Error interno del servidor" });
});

// ─── Iniciar servidor ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  logger.info(`Servidor iniciado y corriendo en puerto ${PORT}`);
  // Safe migration: add ganador_id to Torneos if missing
  try {
    await sequelize.query("ALTER TABLE Torneos ADD COLUMN ganador_id INT DEFAULT NULL", { type: QueryTypes.RAW });
    logger.info("Migración: columna ganador_id añadida a Torneos");
  } catch (e) {
    if (!e.message?.includes("Duplicate column")) logger.warn("Migración ganador_id: " + e.message);
  }
});