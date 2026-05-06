import express from "express";
import mysql from "mysql2";
import cors from "cors";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, ".env") });

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

// ============ SESIÓN ============
app.use(session({
  secret: process.env.SESSION_SECRET || "bracketcore_secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

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

// ============ OAUTH — Helper para buscar o crear usuario ============
const findOrCreateOAuthUser = (email, username, avatar_url, provider, callback) => {
  db.query("SELECT * FROM Usuarios WHERE email = ?", [email], (err, results) => {
    if (err) return callback(err, null);

    if (results.length > 0) {
      // Usuario ya existe — retornarlo
      const { password: _, ...user } = results[0];
      return callback(null, user);
    }

    // Usuario nuevo — crearlo sin contraseña (OAuth)
    const safeUsername = username.replace(/[^a-zA-Z0-9_]/g, "_").substring(0, 30);
    db.query(
      "INSERT INTO Usuarios (username, email, password, avatar_url, oauth_provider) VALUES (?, ?, NULL, ?, ?)",
      [safeUsername, email, avatar_url || null, provider],
      (err, result) => {
        if (err) {
          // Si el username ya existe, agregar sufijo numérico
          const uniqueUsername = safeUsername + "_" + Date.now().toString().slice(-4);
          db.query(
            "INSERT INTO Usuarios (username, email, password, avatar_url, oauth_provider) VALUES (?, ?, NULL, ?, ?)",
            [uniqueUsername, email, avatar_url || null, provider],
            (err2, result2) => {
              if (err2) return callback(err2, null);
              db.query("SELECT * FROM Usuarios WHERE id = ?", [result2.insertId], (err3, rows) => {
                if (err3) return callback(err3, null);
                const { password: _, ...user } = rows[0];
                callback(null, user);
              });
            }
          );
          return;
        }
        db.query("SELECT * FROM Usuarios WHERE id = ?", [result.insertId], (err2, rows) => {
          if (err2) return callback(err2, null);
          const { password: _, ...user } = rows[0];
          callback(null, user);
        });
      }
    );
  });
};

// ============ GOOGLE STRATEGY ============
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3001/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => {
  const email = profile.emails?.[0]?.value || "";
  const username = profile.displayName || profile.id;
  const avatar_url = profile.photos?.[0]?.value || "";
  findOrCreateOAuthUser(email, username, avatar_url, "google", done);
}));

// ============ GITHUB STRATEGY ============
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "http://localhost:3001/auth/github/callback",
  scope: ["user:email"]
}, (accessToken, refreshToken, profile, done) => {
  const email = profile.emails?.[0]?.value || `${profile.id}@github.com`;
  const username = profile.username || profile.displayName || profile.id;
  const avatar_url = profile.photos?.[0]?.value || "";
  findOrCreateOAuthUser(email, username, avatar_url, "github", done);
}));

// ============ RUTAS OAUTH ============

// Iniciar OAuth con Google
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Callback Google
app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed` }),
  (req, res) => {
    const userData = encodeURIComponent(JSON.stringify(req.user));
    res.redirect(`${process.env.FRONTEND_URL}/oauth-callback?user=${userData}`);
  }
);

// Iniciar OAuth con GitHub
app.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }));

// Callback GitHub
app.get("/auth/github/callback",
  passport.authenticate("github", { failureRedirect: `${process.env.FRONTEND_URL}/login?error=github_failed` }),
  (req, res) => {
    const userData = encodeURIComponent(JSON.stringify(req.user));
    res.redirect(`${process.env.FRONTEND_URL}/oauth-callback?user=${userData}`);
  }
);

// ============ USUARIOS (existente) ============

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
    db.query(
      "SELECT id FROM Usuarios WHERE email = ? OR username = ?",
      [email, username],
      async (err, results) => {
        if (err) return res.status(500).json({ error: "Error en la base de datos" });

        if (results.length > 0) {
          return res.status(409).json({ error: "El email o nombre de usuario ya está en uso" });
        }

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

      const { password: _, ...userWithoutPassword } = user;

      res.json({
        message: "Login exitoso",
        user: userWithoutPassword
      });
    }
  );
});

// ============ TORNEOS (NUEVO) ============

// GET /torneos - Obtener todos los torneos con info del juego
app.get("/torneos", (req, res) => {
  const query = `
    SELECT 
      t.id,
      t.nombre as name,
      v.nombre_juego as game,
      t.fecha_inicio as startDate,
      t.fecha_fin as endDate,
      t.max_participantes as players,
      t.estado as status,
      t.descripcion as description,
      t.formato as type,
      t.creado_por as createdBy,
      t.premio as prize,
      t.reglas as rules,
      COUNT(i.id) as registeredPlayers
    FROM Torneos t
    LEFT JOIN Videojuegos v ON t.juego_id = v.id
    LEFT JOIN Inscripciones i ON t.id = i.torneo_id AND i.estatus_aprobacion = 'aprobado'
    GROUP BY t.id
    ORDER BY t.fecha_inicio DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error al obtener torneos:", err);
      return res.status(500).json({ error: "Error al obtener torneos" });
    }
    
    // Formatear los resultados para que coincidan con la estructura esperada
    const formattedResults = results.map(t => ({
      ...t,
      registeredPlayers: parseInt(t.registeredPlayers) || 0,
      players: parseInt(t.players) || 0,
      status: t.status || 'abierto'
    }));
    
    res.json(formattedResults);
  });
});

// GET /torneos/:id - Obtener un torneo específico
app.get("/torneos/:id", (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      t.id,
      t.nombre as name,
      v.nombre_juego as game,
      t.fecha_inicio as startDate,
      t.fecha_fin as endDate,
      t.max_participantes as players,
      t.estado as status,
      t.descripcion as description,
      t.formato as type,
      t.creado_por as createdBy,
      t.premio as prize,
      t.reglas as rules,
      t.juego_id as gameId,
      COUNT(i.id) as registeredPlayers
    FROM Torneos t
    LEFT JOIN Videojuegos v ON t.juego_id = v.id
    LEFT JOIN Inscripciones i ON t.id = i.torneo_id AND i.estatus_aprobacion = 'aprobado'
    WHERE t.id = ?
    GROUP BY t.id
  `;
  
  db.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error al obtener el torneo" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Torneo no encontrado" });
    }
    
    const tournament = results[0];
    tournament.registeredPlayers = parseInt(tournament.registeredPlayers) || 0;
    tournament.players = parseInt(tournament.players) || 0;
    
    res.json(tournament);
  });
});

// POST /torneos - Crear nuevo torneo (protegido - requiere login)
app.post("/torneos", (req, res) => {
  const { 
    nombre, 
    juego_id, 
    fecha_inicio, 
    fecha_fin, 
    max_participantes, 
    descripcion, 
    formato, 
    premio, 
    reglas,
    creado_por 
  } = req.body;

  if (!nombre || !juego_id || !fecha_inicio || !fecha_fin || !max_participantes || !creado_por) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  const query = `
    INSERT INTO Torneos 
    (nombre, juego_id, fecha_inicio, fecha_fin, max_participantes, descripcion, estado, formato, premio, reglas, creado_por) 
    VALUES (?, ?, ?, ?, ?, ?, 'abierto', ?, ?, ?, ?)
  `;
  
  db.query(
    query,
    [nombre, juego_id, fecha_inicio, fecha_fin, max_participantes, descripcion, formato, premio, reglas, creado_por],
    (err, result) => {
      if (err) {
        console.error("Error al crear torneo:", err);
        return res.status(500).json({ error: "Error al crear el torneo" });
      }
      
      res.status(201).json({
        message: "Torneo creado exitosamente",
        tournamentId: result.insertId
      });
    }
  );
});

// PUT /torneos/:id - Actualizar torneo (solo el creador puede editar)
app.put("/torneos/:id", (req, res) => {
  const { id } = req.params;
  const { 
    nombre, 
    juego_id, 
    fecha_inicio, 
    fecha_fin, 
    max_participantes, 
    descripcion, 
    estado, 
    formato, 
    premio, 
    reglas,
    creado_por 
  } = req.body;

  // Verificar que el usuario es el creador
  db.query("SELECT creado_por FROM Torneos WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: "Error en la base de datos" });
    if (results.length === 0) return res.status(404).json({ error: "Torneo no encontrado" });
    
    if (results[0].creado_por !== creado_por) {
      return res.status(403).json({ error: "No tienes permiso para editar este torneo" });
    }

    const query = `
      UPDATE Torneos SET 
        nombre = ?, 
        juego_id = ?, 
        fecha_inicio = ?, 
        fecha_fin = ?, 
        max_participantes = ?, 
        descripcion = ?, 
        estado = ?, 
        formato = ?, 
        premio = ?, 
        reglas = ?
      WHERE id = ?
    `;
    
    db.query(
      query,
      [nombre, juego_id, fecha_inicio, fecha_fin, max_participantes, descripcion, estado, formato, premio, reglas, id],
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: "Error al actualizar el torneo" });
        }
        
        res.json({ message: "Torneo actualizado exitosamente" });
      }
    );
  });
});

// DELETE /torneos/:id - Eliminar torneo (solo el creador)
app.delete("/torneos/:id", (req, res) => {
  const { id } = req.params;
  const { creado_por } = req.body;

  db.query("SELECT creado_por FROM Torneos WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: "Error en la base de datos" });
    if (results.length === 0) return res.status(404).json({ error: "Torneo no encontrado" });
    
    if (results[0].creado_por !== creado_por) {
      return res.status(403).json({ error: "No tienes permiso para eliminar este torneo" });
    }

    db.query("DELETE FROM Torneos WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ error: "Error al eliminar el torneo" });
      res.json({ message: "Torneo eliminado exitosamente" });
    });
  });
});

// GET /torneos/usuario/:userId - Torneos creados por un usuario
app.get("/torneos/usuario/:userId", (req, res) => {
  const { userId } = req.params;
  
  const query = `
    SELECT 
      t.id,
      t.nombre as name,
      v.nombre_juego as game,
      t.fecha_inicio as startDate,
      t.fecha_fin as endDate,
      t.max_participantes as players,
      t.estado as status,
      t.descripcion as description,
      t.formato as type,
      t.premio as prize,
      t.reglas as rules,
      COUNT(i.id) as registeredPlayers
    FROM Torneos t
    LEFT JOIN Videojuegos v ON t.juego_id = v.id
    LEFT JOIN Inscripciones i ON t.id = i.torneo_id AND i.estatus_aprobacion = 'aprobado'
    WHERE t.creado_por = ?
    GROUP BY t.id
    ORDER BY t.fecha_inicio DESC
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: "Error al obtener torneos" });
    
    const formatted = results.map(t => ({
      ...t,
      registeredPlayers: parseInt(t.registeredPlayers) || 0,
      players: parseInt(t.players) || 0
    }));
    
    res.json(formatted);
  });
});

// ============ VIDEOJUEGOS ============

// GET /videojuegos - Lista de juegos disponibles
app.get("/videojuegos", (req, res) => {
  db.query("SELECT * FROM Videojuegos ORDER BY nombre_juego", (err, results) => {
    if (err) return res.status(500).json({ error: "Error al obtener videojuegos" });
    res.json(results);
  });
});

// ============ INSCRIPCIONES ============

// POST /inscripciones - Inscribirse a un torneo
app.post("/inscripciones", (req, res) => {
  const { usuario_id, torneo_id } = req.body;

  // Verificar si el torneo existe y tiene cupo
  db.query(
    "SELECT max_participantes, estado FROM Torneos WHERE id = ?",
    [torneo_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Error en la base de datos" });
      if (results.length === 0) return res.status(404).json({ error: "Torneo no encontrado" });
      
      const tournament = results[0];
      
      // Verificar si ya está inscrito
      db.query(
        "SELECT id FROM Inscripciones WHERE usuario_id = ? AND torneo_id = ?",
        [usuario_id, torneo_id],
        (err, existing) => {
          if (err) return res.status(500).json({ error: "Error en la base de datos" });
          if (existing.length > 0) return res.status(409).json({ error: "Ya estás inscrito en este torneo" });
          
          // Verificar cupo
          db.query(
            "SELECT COUNT(*) as count FROM Inscripciones WHERE torneo_id = ? AND estatus_aprobacion = 'aprobado'",
            [torneo_id],
            (err, countResult) => {
              if (err) return res.status(500).json({ error: "Error en la base de datos" });
              
              const currentCount = countResult[0].count;
              if (currentCount >= tournament.max_participantes) {
                return res.status(400).json({ error: "El torneo ya está lleno" });
              }
              
              // Crear inscripción
              db.query(
                "INSERT INTO Inscripciones (usuario_id, torneo_id, estatus_aprobacion) VALUES (?, ?, 'aprobado')",
                [usuario_id, torneo_id],
                (err, result) => {
                  if (err) return res.status(500).json({ error: "Error al inscribirse" });
                  
                  res.status(201).json({
                    message: "Inscripción exitosa",
                    inscriptionId: result.insertId
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

app.listen(3001, () => {
  console.log("Servidor corriendo en puerto 3001");
});