import express from "express";
import { QueryTypes } from "sequelize";
import sequelize from "../config/database.js";
import logger from "../utils/logger.js";
import { advanceWinner } from "../utils/bracketHelper.js";

const router = express.Router();

router.put("/:id/reportar", async (req, res) => {
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

router.put("/:id/decidir", async (req, res) => {
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

export default router;
