import express from "express";
import { QueryTypes } from "sequelize";
import sequelize from "../config/database.js";
import logger from "../utils/logger.js";
import { advanceWinner } from "../utils/bracketHelper.js";

const router = express.Router();

router.post("/:id/bracket/generar", async (req, res) => {
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

router.post("/:id/bracket/reset", async (req, res) => {
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

router.get("/:id/bracket", async (req, res) => {
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

export default router;
