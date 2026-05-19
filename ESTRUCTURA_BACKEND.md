# Estructura del Backend (Refactorización)

El proyecto ha sido reestructurado para mejorar la organización, mantenibilidad y escalabilidad, separando el enorme archivo `server.js` en múltiples archivos específicos de acuerdo a su dominio de negocio. Ninguna funcionalidad se ha perdido durante este proceso.

A continuación se detalla la nueva estructura de la carpeta `backend/` y la función de cada archivo.

## 📂 Directorio Raíz (`backend/`)

- **`server.js`**: Sigue siendo el punto de entrada de la aplicación, pero ahora es mucho más pequeño y limpio. Se encarga únicamente de configurar Express, la conexión a la base de datos, Passport (sesiones) y de registrar las rutas (ej: `app.use("/usuarios", userRoutes)`).
- **`.env`**: Archivo de variables de entorno (credenciales de BD, puertos, secretos de OAuth, etc.).
- **`package.json` / `package-lock.json`**: Dependencias de Node.js.

---

## 📂 `config/` (Configuraciones)

- **`database.js`**: Contiene la configuración y conexión a la base de datos MySQL usando Sequelize.
- **`passport.js`**: **(NUEVO)** Se ha extraído toda la lógica de autenticación OAuth (Google y GitHub) aquí, incluyendo la serialización y las estrategias.

---

## 📂 `routes/` (Rutas Separadas) **[NUEVO DIRECTORIO]**

Este directorio contiene los archivos JavaScript que gestionan las distintas peticiones web (GET, POST, PUT, DELETE) separadas por categoría:

1. **`auth.js`**: Maneja todo el flujo de sesión.
   - Rutas: `/register`, `/login`, y callbacks de autenticación social (`/auth/google`, `/auth/github`).
2. **`usuarios.js`**: Gestión de cuentas de usuario.
   - Rutas: Obtener, actualizar y eliminar usuarios (`/usuarios/:id`).
3. **`torneos.js`**: Creación, lectura, edición y finalización de torneos en general.
   - Rutas: `/torneos`, `/torneos/:id`, `/torneos/:id/finalizar`, etc.
4. **`bracket.js`**: Manejo exclusivo del motor del bracket (llaves de torneo).
   - Rutas: Generación (`/torneos/:id/bracket/generar`), reseteo (`/torneos/:id/bracket/reset`) y lectura del bracket.
5. **`partidas.js`**: Lógica para reportar o decidir los ganadores de cada enfrentamiento individual.
   - Rutas: `/partidas/:id/reportar`, `/partidas/:id/decidir`.
6. **`admin.js`**: Todo lo relacionado con el panel de administrador.
   - Rutas: Diferentes reportes (`/admin/reportes/...`), edición de administrador y eliminación lógica o física de torneos.
7. **`videojuegos.js`**: Catálogo de videojuegos para los torneos.
   - Rutas: `/videojuegos`.
8. **`inscripciones.js`**: Gestión de los jugadores que se apuntan a los torneos.
   - Rutas: `/inscripciones`, comprobación de plazas disponibles y darse de baja.

---

## 📂 `utils/` (Utilidades Comunes)

- **`logger.js`**: Herramienta de registro (logs) que se usaba previamente para guardar la información en `logs/`.
- **`bracketHelper.js`**: **(NUEVO)** Contiene la función `advanceWinner`, que se encarga de calcular matemáticamente el avance automático del ganador a la siguiente ronda del bracket. Se ha separado aquí para que pueda ser utilizada fácilmente desde distintas rutas sin repetir código.

---

## 📂 `models/` (Modelos de Base de Datos)

- **`Usuario.js`**: Define la estructura de la tabla de usuarios utilizando Sequelize ORM.

---

## 📂 `logs/` (Registros de Actividad)

- **`error.log` / `combined.log`**: Archivos autogenerados donde Winston (el logger) guarda la actividad del servidor y posibles errores en tiempo de ejecución.
