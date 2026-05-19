import express from "express";
import { QueryTypes } from "sequelize";
import sequelize from "../config/database.js";
import logger from "../utils/logger.js";

const router = express.Router();

router.get("/check", async (req, res) => {
  const { usuario_id, torneo_id } = req.query;
  if (!usuario_id || !torneo_id) return res.status(400).json({ error: "Faltan parámetros" });
  try {
    const [existing] = await sequelize.query(
      "SELECT id FROM Inscripciones WHERE usuario_id = :usuario_id AND torneo_id = :torneo_id",
      { replacements: { usuario_id, torneo_id }, type: QueryTypes.SELECT }
    );
    res.json({ enrolled: !!existing });
  } catch (error) {
    logger.error("GET /inscripciones/check — Error:", error);
    res.status(500).json({ error: "Error al verificar inscripción" });
  }
});

router.post("/", async (req, res) => {
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

router.delete("/:torneo_id/:usuario_id", async (req, res) => {
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

export default router;
