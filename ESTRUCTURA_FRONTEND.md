# Estructura del Frontend (Refactorización)

El frontend de la aplicación web (React + Vite) ha sido reestructurado para evitar tener decenas de archivos en una misma carpeta plana (`src/pages/`). Ahora todo el código visual y lógico está altamente organizado por dominio y caso de uso.

## 📂 Directorio Raíz del Frontend (`src/`)

- **`App.tsx`**: El enrutador principal de React. Contiene la declaración de todas las rutas públicas y protegidas, envolviendo la app en los proveedores de Context (ej. `AuthProvider`).
- **`App.css` / `index.css`**: Archivos de estilos globales.
- **`main.tsx`**: El punto de montaje donde React se inyecta en el HTML.

---

## 📂 `components/` (Componentes Reutilizables)

Componentes que se utilizan a lo largo de toda la aplicación, independientemente de la página actual.
- **`Navbar.tsx` / `Footer.tsx`**: Componentes de navegación y pie de página.
- **`Carousel.tsx`**: Elemento visual reutilizable.
- **`ProtectedRoute.tsx` / `GuestRoute.tsx`**: Envoltorios de seguridad. Redirigen usuarios dependiendo de si han iniciado sesión o no.

---

## 📂 `pages/` (Páginas Agrupadas por Dominio) **[NUEVA ESTRUCTURA]**

Las páginas ya no están sueltas; han sido organizadas en subcarpetas lógicas, conteniendo cada archivo `.tsx` su correspondiente hoja de estilos `.css` justo al lado.

### 📁 `pages/Auth/` (Autenticación)
Maneja toda la entrada y registro de usuarios en la plataforma.
- **`Login.tsx`** y `Login.css`: Formulario de inicio de sesión.
- **`Register.tsx`** y `Register.css`: Formulario de creación de cuenta.
- **`OAuthCallback.tsx`**: Pantalla de transición que procesa el retorno tras un inicio de sesión exitoso con Google o GitHub.

### 📁 `pages/Tournaments/` (Dominio de Torneos)
El núcleo interactivo de la aplicación para los jugadores y organizadores.
- **`AllTournaments.tsx`**: Vista de exploración con todos los torneos disponibles.
- **`CreateTournament.tsx`**: Formulario para dar de alta un nuevo torneo.
- **`EditTournament.tsx`**: Edición de los detalles de un torneo existente.
- **`TournamentManager.tsx`**: Panel de control del organizador para ver sus torneos creados.
- **`TournamentDetail.tsx`**: La página pública de información de un torneo concreto (participantes, reglas).
- **`TournamentBracket.tsx`**: Visualizador e interactor de la llave (bracket) del torneo.

### 📁 `pages/Admin/` (Administración)
Exclusivo para el control global.
- **`AdminDashboard.tsx`**: El panel de reportes estadísticos y acciones administrativas globales de la plataforma. (A futuro, se recomienda dividir las gráficas de este enorme archivo en subcomponentes).

### 📁 `pages/Core/` (Vistas Base)
Las páginas informativas o básicas del sistema.
- **`Home.tsx`**: La portada de la página web (landing page).
- **`About.tsx`**: Información sobre la plataforma.
- **`Profile.tsx`**: Perfil personal del usuario logueado.

---

## 📂 `context/` (Manejo de Estado Global)

- **`AuthContext.tsx`**: Provee a toda la aplicación el estado de inicio de sesión actual (quién es el usuario, su rol, y si está logueado), eliminando la necesidad de pasar propiedades manualmente de componente a componente.
