import express from "express";
import { QueryTypes } from "sequelize";
import sequelize from "../config/database.js";
import logger from "../utils/logger.js";

const router = express.Router();

router.get("/", async (req, res) => {
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

export default router;
