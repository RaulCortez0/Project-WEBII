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
  secret: process.env.SESSION_SECRET || "secret",
  resave: false,
  saveUninitialized: false
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
      usuario = await Usuario.create({
        username: profile.displayName.replace(/\s/g, "_").toLowerCase(),
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
      usuario = await Usuario.create({
        username: profile.username,
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

// ─── GET /usuarios — Obtener todos los usuarios ──────────────────────────────
app.get("/usuarios", async (req, res) => {
  logger.info("GET /usuarios — Solicitud recibida");
  try {
    const usuarios = await Usuario.findAll({
      attributes: { exclude: ["password"] }, // Nunca exponer contraseñas
    });
    logger.info(`GET /usuarios — Retornando ${usuarios.length} usuarios`);
    res.json(usuarios);
  } catch (error) {
    logger.error("GET /usuarios — Error al obtener usuarios:", error);
    res.status(500).json({ error: "Error al obtener los usuarios" });
  }
});

// ─── GET /usuarios/:id — Obtener un usuario por ID ───────────────────────────
app.get("/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  logger.info(`GET /usuarios/${id} — Solicitud recibida`);
  try {
    const usuario = await Usuario.findByPk(id, {
      attributes: { exclude: ["password"] },
    });
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

// ─── POST /register — Crear nuevo usuario ────────────────────────────────────
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  logger.info(`POST /register — Intento de registro: ${email}`);

  if (!username || !email || !password) {
    logger.warn("POST /register — Campos incompletos en la solicitud");
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }

  try {
    // Verificar si el email o username ya existe
    const existente = await Usuario.findOne({
      where: { email },
    });
    const existenteUsername = await Usuario.findOne({
      where: { username },
    });

    if (existente || existenteUsername) {
      logger.warn(`POST /register — Email o username ya en uso: ${email} / ${username}`);
      return res.status(409).json({ error: "El email o nombre de usuario ya está en uso" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = await Usuario.create({
      username,
      email,
      password: hashedPassword,
    });

    logger.info(`POST /register — Usuario creado exitosamente: ID ${nuevoUsuario.id} (${email})`);
    res.status(201).json({
      message: "Usuario creado exitosamente",
      userId: nuevoUsuario.id,
    });
  } catch (error) {
    logger.error("POST /register — Error al crear usuario:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── POST /login — Autenticar usuario ────────────────────────────────────────
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  logger.info(`POST /login — Intento de login: ${email}`);

  if (!email || !password) {
    logger.warn("POST /login — Faltan credenciales en la solicitud");
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
    logger.info(`POST /login — Login exitoso para: ${email} (ID: ${usuario.id})`);
    res.json({
      message: "Login exitoso",
      user: userWithoutPassword,
    });
  } catch (error) {
    logger.error("POST /login — Error durante el login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── PUT /usuarios/:id — Actualizar usuario ───────────────────────────────────
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

    // Si se envía una nueva contraseña, hashearla
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
      logger.info(`PUT /usuarios/${id} — Contraseña actualizada`);
    }

    await usuario.update(updateData);
    logger.info(`PUT /usuarios/${id} — Usuario actualizado correctamente`);
    const { password: _, ...updatedUser } = usuario.toJSON();
    res.json({ message: "Usuario actualizado", user: updatedUser });
  } catch (error) {
    logger.error(`PUT /usuarios/${id} — Error al actualizar:`, error);
    res.status(500).json({ error: "Error al actualizar el usuario" });
  }
});


// ─── DELETE /usuarios/:id — Eliminar usuario ─────────────────────────────────
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
    logger.info(`DELETE /usuarios/${id} — Usuario eliminado correctamente`);
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    logger.error(`DELETE /usuarios/${id} — Error al eliminar:`, error);
    res.status(500).json({ error: "Error al eliminar el usuario" });
  }
});

// ─── Rutas OAuth Google ───────────────────────────────────────────────────────
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: `${process.env.FRONTEND_URL}/login` }),
  (req, res) => {
    const user = JSON.stringify(req.user);
    const encoded = encodeURIComponent(user);
    logger.info(`OAuth Google callback exitoso`);
    res.redirect(`${process.env.FRONTEND_URL}/oauth-callback?user=${encoded}`);
  }
);

// ─── Rutas OAuth GitHub ───────────────────────────────────────────────────────
app.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }));

app.get("/auth/github/callback",
  passport.authenticate("github", { failureRedirect: `${process.env.FRONTEND_URL}/login` }),
  (req, res) => {
    const user = JSON.stringify(req.user);
    const encoded = encodeURIComponent(user);
    logger.info(`OAuth GitHub callback exitoso`);
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