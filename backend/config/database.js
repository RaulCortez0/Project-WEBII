import { Sequelize } from "sequelize";
import logger from "../utils/logger.js";

const sequelize = new Sequelize(
  process.env.DB_NAME || "PWII",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql",
    logging: (msg) => logger.debug(msg), // Queries SQL van al log en nivel debug
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

export default sequelize;
