import express from "express";
import { QueryTypes } from "sequelize";
import sequelize from "../config/database.js";
import logger from "../utils/logger.js";

const router = express.Router();

router.get("/", async (req, res) => {
  logger.info("GET /torneos — Solicitud recibida");
  try {
    const results = await sequelize.query(`
      SELECT t.id, t.nombre as name, v.nombre_juego as game,
        t.fecha_inicio as startDate, t.fecha_fin as endDate,
        t.max_participantes as players, t.estado as status,
        t.descripcion as description, t.formato as type,
        t.creado_por as createdBy, uc.username as createdByUsername,
        t.premio as prize, t.reglas as rules,
        t.bracket_iniciado as bracketIniciado,
        COUNT(i.id) as registeredPlayers
      FROM Torneos t
      LEFT JOIN Videojuegos v ON t.juego_id = v.id
      LEFT JOIN Usuarios uc ON t.creado_por = uc.id
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

router.get("/usuario/:userId", async (req, res) => {
  const { userId } = req.params;
  logger.info(`GET /torneos/usuario/${userId} — Solicitud recibida`);
  try {
    const results = await sequelize.query(`
      SELECT t.id, t.nombre as name, v.nombre_juego as game,
        t.fecha_inicio as startDate, t.fecha_fin as endDate,
        t.max_participantes as players, t.estado as status,
        t.descripcion as description, t.formato as type,
        t.creado_por as createdBy, uc.username as createdByUsername,
        t.premio as prize, t.reglas as rules, t.bracket_iniciado as bracketIniciado,
        t.juego_id as gameId, COUNT(i.id) as registeredPlayers
      FROM Torneos t
      LEFT JOIN Videojuegos v ON t.juego_id = v.id
      LEFT JOIN Usuarios uc ON t.creado_por = uc.id
      LEFT JOIN Inscripciones i ON t.id = i.torneo_id AND i.estatus_aprobacion = 'aprobado'
      WHERE t.creado_por = :userId AND t.estado != 'eliminado'
      GROUP BY t.id ORDER BY t.fecha_inicio DESC
    `, { replacements: { userId }, type: QueryTypes.SELECT });
    res.json(results.map(t => ({ ...t, registeredPlayers: parseInt(t.registeredPlayers) || 0, players: parseInt(t.players) || 0 })));
  } catch (error) {
    logger.error(`GET /torneos/usuario/${userId} — Error:`, error);
    res.status(500).json({ error: "Error al obtener torneos" });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  logger.info(`GET /torneos/${id} — Solicitud recibida`);
  try {
    const results = await sequelize.query(`
      SELECT t.id, t.nombre as name, v.nombre_juego as game,
        t.fecha_inicio as startDate, t.fecha_fin as endDate,
        t.max_participantes as players, t.estado as status,
        t.descripcion as description, t.formato as type,
        t.creado_por as createdBy, uc.username as createdByUsername,
        t.premio as prize, t.reglas as rules,
        t.juego_id as gameId, t.bracket_iniciado as bracketIniciado,
        ug.username as ganadorNombre, t.ganador_id as ganadorId,
        COUNT(i.id) as registeredPlayers
      FROM Torneos t
      LEFT JOIN Videojuegos v ON t.juego_id = v.id
      LEFT JOIN Inscripciones i ON t.id = i.torneo_id AND i.estatus_aprobacion = 'aprobado'
      LEFT JOIN Usuarios ug ON t.ganador_id = ug.id
      LEFT JOIN Usuarios uc ON t.creado_por = uc.id
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

router.post("/", async (req, res) => {
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

router.put("/:id", async (req, res) => {
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

router.delete("/:id", async (req, res) => {
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

router.put("/:id/finalizar", async (req, res) => {
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

export default router;
