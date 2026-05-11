import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Usuario = sequelize.define(
  "Usuario",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true, // NULL para usuarios OAuth
    },
    role: {
      type: DataTypes.ENUM("admin", "organizador", "jugador"),
      defaultValue: "jugador",
    },
    fecha_registro: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    avatar_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    oauth_provider: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  },
  {
    tableName: "usuarios",  // Nombre exacto en la BD (minúsculas)
    timestamps: false,      // La tabla no tiene createdAt/updatedAt de Sequelize
  }
);

export default Usuario;
