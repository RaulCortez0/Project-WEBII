import express from "express";
import mysql from "mysql2";
import cors from "cors";
import bcrypt from "bcrypt";

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "PWII"
});

db.connect((err) => {
  if (err) {
    console.log("Error de conexión:", err);
  } else {
    console.log("Conectado a MySQL");
  }
});

// GET todos los usuarios
app.get("/usuarios", (req, res) => {
  db.query("SELECT * FROM Usuarios", (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(result);
    }
  });
});

// POST /register — Crear nuevo usuario
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }

  try {
    // Verificar si el email o username ya existe
    db.query(
      "SELECT id FROM Usuarios WHERE email = ? OR username = ?",
      [email, username],
      async (err, results) => {
        if (err) return res.status(500).json({ error: "Error en la base de datos" });

        if (results.length > 0) {
          return res.status(409).json({ error: "El email o nombre de usuario ya está en uso" });
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        db.query(
          "INSERT INTO Usuarios (username, email, password) VALUES (?, ?, ?)",
          [username, email, hashedPassword],
          (err, result) => {
            if (err) return res.status(500).json({ error: "Error al crear el usuario" });

            res.status(201).json({
              message: "Usuario creado exitosamente",
              userId: result.insertId
            });
          }
        );
      }
    );
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST /login — Autenticar usuario
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña son requeridos" });
  }

  db.query(
    "SELECT * FROM Usuarios WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) return res.status(500).json({ error: "Error en la base de datos" });

      if (results.length === 0) {
        return res.status(401).json({ error: "Email o contraseña incorrectos" });
      }

      const user = results[0];

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ error: "Email o contraseña incorrectos" });
      }

      // No enviar la contraseña de vuelta
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        message: "Login exitoso",
        user: userWithoutPassword
      });
    }
  );
});

app.listen(3001, () => {
  console.log("Servidor corriendo en puerto 3001");
});