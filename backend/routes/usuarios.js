import express from "express";
import bcrypt from "bcrypt";
import logger from "../utils/logger.js";
import Usuario from "../models/Usuario.js";

const router = express.Router();

router.get("/", async (req, res) => {
  logger.info("GET /usuarios — Solicitud recibida");
  try {
    const usuarios = await Usuario.findAll({ attributes: { exclude: ["password"] } });
    logger.info(`GET /usuarios — Retornando ${usuarios.length} usuarios`);
    res.json(usuarios);
  } catch (error) {
    logger.error("GET /usuarios — Error:", error);
    res.status(500).json({ error: "Error al obtener los usuarios" });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  logger.info(`GET /usuarios/${id} — Solicitud recibida`);
  try {
    const usuario = await Usuario.findByPk(id, { attributes: { exclude: ["password"] } });
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

router.put("/:id", async (req, res) => {
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

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
      logger.info(`PUT /usuarios/${id} — Contraseña actualizada`);
    }

    await usuario.update(updateData);
    logger.info(`PUT /usuarios/${id} — Usuario actualizado correctamente`);
    const { password: _, ...updatedUser } = usuario.toJSON();
    res.json({ message: "Usuario actualizado", user: updatedUser });
  } catch (error) {
    logger.error(`PUT /usuarios/${id} — Error:`, error);
    res.status(500).json({ error: "Error al actualizar el usuario" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  logger.info(`DELETE /usuarios/${id} — Solicitud de eliminación`);

  try {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      logger.warn(`DELETE /usuarios/${id} — Usuario no encontrado`);
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    await usuario.destroy();
    logger.info(`DELETE /usuarios/${id} — Usuario eliminado`);
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    logger.error(`DELETE /usuarios/${id} — Error:`, error);
    res.status(500).json({ error: "Error al eliminar el usuario" });
  }
});

export default router;
