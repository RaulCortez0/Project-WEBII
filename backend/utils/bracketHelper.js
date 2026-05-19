import { QueryTypes } from "sequelize";
import sequelize from "../config/database.js";
import logger from "./logger.js";

export async function advanceWinner(torneo_id, ronda, bracket_pos, ganador_id) {
  const next_ronda = ronda + 1;
  const next_pos = Math.floor(bracket_pos / 2);
  const is_j1_slot = bracket_pos % 2 === 0;

  const [existing] = await sequelize.query(
    "SELECT id, jugador1_id, jugador2_id FROM Partidas WHERE torneo_id = :torneo_id AND ronda = :ronda AND bracket_pos = :pos",
    { replacements: { torneo_id, ronda: next_ronda, pos: next_pos }, type: QueryTypes.SELECT }
  );

  if (existing) {
    const field = is_j1_slot ? "jugador1_id" : "jugador2_id";
    await sequelize.query(
      `UPDATE Partidas SET ${field} = :ganador WHERE id = :id`,
      { replacements: { ganador: ganador_id, id: existing.id }, type: QueryTypes.UPDATE }
    );
    const j1 = is_j1_slot ? ganador_id : existing.jugador1_id;
    const j2 = is_j1_slot ? existing.jugador2_id : ganador_id;
    if (j1 && j2) {
      // Both players present → match is ready
      await sequelize.query(
        "UPDATE Partidas SET estado = 'pendiente' WHERE id = :id",
        { replacements: { id: existing.id }, type: QueryTypes.UPDATE }
      );
    } else {
      // Only one player in existing match → auto-advance as bye
      const soloPlayer = j1 || j2;
      await sequelize.query(
        "UPDATE Partidas SET ganador_id = :g, estado = 'confirmado', es_bye = 1 WHERE id = :id",
        { replacements: { g: soloPlayer, id: existing.id }, type: QueryTypes.UPDATE }
      );
      await advanceWinner(torneo_id, next_ronda, next_pos, soloPlayer);
    }
  } else {
    const j1 = is_j1_slot ? ganador_id : null;
    const j2 = is_j1_slot ? null : ganador_id;

    // Check if the sibling feeder match at CURRENT ronda exists.
    // Sibling feeds the OTHER slot of next_pos. If it doesn't exist,
    // no opponent will ever arrive → this player is the champion.
    const sibling_bracket_pos = bracket_pos % 2 === 0 ? bracket_pos + 1 : bracket_pos - 1;
    const [siblingMatch] = await sequelize.query(
      "SELECT id FROM Partidas WHERE torneo_id = :torneo_id AND ronda = :ronda AND bracket_pos = :pos",
      { replacements: { torneo_id, ronda, pos: sibling_bracket_pos }, type: QueryTypes.SELECT }
    );

    if (!siblingMatch) {
      // No sibling feeder → solo player is the champion → auto-confirm
      logger.info(`advanceWinner: no sibling at ronda ${ronda} pos ${sibling_bracket_pos} — ${ganador_id} es campeón`);
      await sequelize.query(
        "INSERT INTO Partidas (torneo_id, jugador1_id, jugador2_id, ronda, bracket_pos, estado, ganador_id, es_bye) VALUES (:torneo_id, :j1, :j2, :ronda, :pos, 'confirmado', :ganador, 1)",
        { replacements: { torneo_id, j1, j2, ronda: next_ronda, pos: next_pos, ganador: ganador_id }, type: QueryTypes.INSERT }
      );
    } else {
      // Sibling exists → opponent will arrive later → create waiting slot
      await sequelize.query(
        "INSERT INTO Partidas (torneo_id, jugador1_id, jugador2_id, ronda, bracket_pos, estado, es_bye) VALUES (:torneo_id, :j1, :j2, :ronda, :pos, 'esperando', 0)",
        { replacements: { torneo_id, j1, j2, ronda: next_ronda, pos: next_pos }, type: QueryTypes.INSERT }
      );
    }
  }
}
