import express from "express";
import bcrypt from "bcrypt";
import passport from "passport";
import logger from "../utils/logger.js";
import Usuario from "../models/Usuario.js";

const router = express.Router();

router.post("/register", async (req, res) => {
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

router.post("/login", async (req, res) => {
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

router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" }));

router.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?error=google_failed` }),
  (req, res) => {
    const encoded = encodeURIComponent(JSON.stringify(req.user));
    logger.info("OAuth Google callback exitoso");
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?user=${encoded}`);
  }
);

router.get("/auth/github", passport.authenticate("github", { scope: ["user:email"], prompt: "select_account" }));

router.get("/auth/github/callback",
  passport.authenticate("github", { failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?error=github_failed` }),
  (req, res) => {
    const encoded = encodeURIComponent(JSON.stringify(req.user));
    logger.info("OAuth GitHub callback exitoso");
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?user=${encoded}`);
  }
);

export default router;
