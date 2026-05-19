import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import session from "express-session";
import passport from "./config/passport.js";
import { QueryTypes } from "sequelize";

dotenv.config();

import logger from "./utils/logger.js";
import sequelize from "./config/database.js";

// Routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/usuarios.js";
import tournamentRoutes from "./routes/torneos.js";
import bracketRoutes from "./routes/bracket.js";
import matchRoutes from "./routes/partidas.js";
import adminRoutes from "./routes/admin.js";
import gameRoutes from "./routes/videojuegos.js";
import inscriptionRoutes from "./routes/inscripciones.js";

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

// ─── Rutas ───────────────────────────────────────────────────────────────────
app.use("/", authRoutes); // Contiene /register, /login, /auth/google, /auth/github
app.use("/usuarios", userRoutes);
app.use("/torneos", tournamentRoutes);
app.use("/torneos", bracketRoutes); // Contiene rutas de bracket bajo /torneos/:id/bracket
app.use("/partidas", matchRoutes);
app.use("/admin", adminRoutes);
app.use("/videojuegos", gameRoutes);
app.use("/inscripciones", inscriptionRoutes);

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