import express from "express";
import { QueryTypes } from "sequelize";
import sequelize from "../config/database.js";
import logger from "../utils/logger.js";

const router = express.Router();

router.get("/reportes/popularidad-juegos", async (req, res) => {
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

router.get("/reportes/ranking-jugadores", async (req, res) => {
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

router.get("/reportes/ocupacion-torneos", async (req, res) => {
  logger.info("GET /admin/reportes/ocupacion-torneos");
  try {
    const results = await sequelize.query(`
      SELECT t.id, t.nombre, v.nombre_juego as juego,
        CASE
          WHEN t.estado = 'eliminado' THEN 'eliminado'
          WHEN t.estado = 'finalizado' THEN 'finalizado'
          WHEN t.estado = 'en curso' OR t.bracket_iniciado = 1 THEN 'en curso'
          WHEN t.fecha_fin < NOW() THEN 'finalizado'
          ELSE t.estado
        END as estado,
        t.max_participantes,
        COUNT(i.id) as inscritos,
        ROUND((COUNT(i.id) / t.max_participantes) * 100, 1) as porcentaje_llenado
      FROM Torneos t
      LEFT JOIN Videojuegos v ON t.juego_id = v.id
      LEFT JOIN Inscripciones i ON t.id = i.torneo_id AND i.estatus_aprobacion = 'aprobado'
      GROUP BY t.id, t.nombre, v.nombre_juego, t.estado, t.bracket_iniciado, t.fecha_fin, t.max_participantes
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

router.get("/reportes/disponibilidad-cupos", async (req, res) => {
  logger.info("GET /admin/reportes/disponibilidad-cupos");
  try {
    const results = await sequelize.query(`
      SELECT t.id, t.nombre, v.nombre_juego as juego,
        CASE
          WHEN t.estado = 'en curso' OR t.bracket_iniciado = 1 THEN 'en curso'
          ELSE t.estado
        END as estado,
        t.max_participantes,
        COUNT(i.id) as inscritos,
        (t.max_participantes - COUNT(i.id)) as cupos_disponibles
      FROM Torneos t
      LEFT JOIN Videojuegos v ON t.juego_id = v.id
      LEFT JOIN Inscripciones i ON t.id = i.torneo_id AND i.estatus_aprobacion = 'aprobado'
      WHERE t.estado IN ('abierto', 'en curso')
        AND t.estado != 'eliminado'
        AND t.estado != 'finalizado'
        AND t.fecha_fin >= NOW()
      GROUP BY t.id, t.nombre, v.nombre_juego, t.estado, t.bracket_iniciado, t.max_participantes
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

router.get("/reportes/campeones", async (req, res) => {
  logger.info("GET /admin/reportes/campeones");
  try {
    const results = await sequelize.query(`
      SELECT
        u.id,
        u.username,
        u.email,
        COUNT(DISTINCT t_ganados.id) AS torneos_ganados,
        COUNT(DISTINCT CASE WHEN (p.jugador1_id = u.id OR p.jugador2_id = u.id)
          AND p.es_bye = 0 AND p.estado = 'confirmado' THEN p.id END) AS partidas_jugadas,
        COUNT(DISTINCT CASE WHEN p.ganador_id = u.id AND p.es_bye = 0
          AND p.estado = 'confirmado' THEN p.id END) AS partidas_ganadas,
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

router.put("/torneos/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, juego_id, fecha_inicio, fecha_fin, max_participantes, descripcion, estado, formato, premio, reglas } = req.body;
  logger.info(`PUT /admin/torneos/${id} — Edición de admin`);
  try {
    const [check] = await sequelize.query("SELECT id FROM Torneos WHERE id = :id", { replacements: { id }, type: QueryTypes.SELECT });
    if (!check) return res.status(404).json({ error: "Torneo no encontrado" });

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

router.delete("/torneos/:id/logico", async (req, res) => {
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

router.delete("/torneos/:id/real", async (req, res) => {
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

router.get("/torneos", async (req, res) => {
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

export default router;
