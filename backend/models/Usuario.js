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
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(255),
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
    tableName: "Usuarios",   // Nombre exacto de tu tabla en MySQL
    timestamps: false,       // Tu tabla no tiene createdAt/updatedAt
  }
);

export default Usuario;
