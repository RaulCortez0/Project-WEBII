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
        COUNT(i.id) as registeredPlayers
      FROM Torneos t
      LEFT JOIN Videojuegos v ON t.juego_id = v.id
      LEFT JOIN Inscripciones i ON t.id = i.torneo_id AND i.estatus_aprobacion = 'aprobado'
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
        t.premio as prize, t.reglas as rules,
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
        t.juego_id as gameId, COUNT(i.id) as registeredPlayers
      FROM Torneos t
      LEFT JOIN Videojuegos v ON t.juego_id = v.id
      LEFT JOIN Inscripciones i ON t.id = i.torneo_id AND i.estatus_aprobacion = 'aprobado'
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
  const { nombre, juego_id, fecha_inicio, fecha_fin, max_participantes, descripcion, estado, formato, premio, reglas, creado_por } = req.body;
  logger.info(`PUT /torneos/${id} — Actualizar torneo`);

  try {
    const [check] = await sequelize.query("SELECT creado_por FROM Torneos WHERE id = :id", { replacements: { id }, type: QueryTypes.SELECT });
    if (!check) return res.status(404).json({ error: "Torneo no encontrado" });
    if (check.creado_por !== creado_por) return res.status(403).json({ error: "No tienes permiso para editar este torneo" });

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
  const { creado_por } = req.body;
  logger.info(`DELETE /torneos/${id} — Solicitud de eliminación`);

  try {
    const [check] = await sequelize.query("SELECT creado_por FROM Torneos WHERE id = :id", { replacements: { id }, type: QueryTypes.SELECT });
    if (!check) return res.status(404).json({ error: "Torneo no encontrado" });
    if (check.creado_por !== creado_por) return res.status(403).json({ error: "No tienes permiso para eliminar este torneo" });

    await sequelize.query("DELETE FROM Torneos WHERE id = :id", { replacements: { id }, type: QueryTypes.DELETE });
    logger.info(`DELETE /torneos/${id} — Torneo eliminado`);
    res.json({ message: "Torneo eliminado exitosamente" });
  } catch (error) {
    logger.error(`DELETE /torneos/${id} — Error:`, error);
    res.status(500).json({ error: "Error al eliminar el torneo" });
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
      "SELECT max_participantes, estado FROM Torneos WHERE id = :torneo_id",
      { replacements: { torneo_id }, type: QueryTypes.SELECT }
    );
    if (!torneo) return res.status(404).json({ error: "Torneo no encontrado" });

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
app.listen(PORT, () => {
  logger.info(`Servidor iniciado y corriendo en puerto ${PORT}`);
});