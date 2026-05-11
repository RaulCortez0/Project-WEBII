import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = path.join(__dirname, "..", "logs");

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Formato personalizado para los logs
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level.toUpperCase()}: ${stack || message}`;
});

const logger = winston.createLogger({
  level: "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Log de errores en archivo separado
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      options: { encoding: "utf8" },
    }),
    // Todos los logs en archivo combined
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      options: { encoding: "utf8" },
    }),
  ],
});

// En desarrollo, también mostrar en consola con colores
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: "HH:mm:ss" }),
        printf(({ level, message, timestamp }) => {
          return `[${timestamp}] ${level}: ${message}`;
        })
      ),
    })
  );
}

export default logger;
