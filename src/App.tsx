import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import About from "./pages/About";
import TournamentManager from "./pages/TournamentManager";
import AllTournaments from "./pages/AllTournaments";
import CreateTournament from "./pages/CreateTournament";
import EditTournament from "./pages/EditTournament";
import TournamentDetail from "./pages/TournamentDetail";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/torneos" element={<AllTournaments />} />
          <Route path="/torneo/:id" element={<TournamentDetail />} /> {/* NUEVO */}

          {/* Solo para usuarios NO autenticados */}
          <Route
            path="/registro"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />

          {/* Rutas protegidas — requieren sesión */}
          <Route
            path="/gestion-torneos"
            element={
              <ProtectedRoute>
                <TournamentManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crear-torneo"
            element={
              <ProtectedRoute>
                <CreateTournament />
              </ProtectedRoute>
            }
          />
          <Route
            path="/editar-torneo"
            element={
              <ProtectedRoute>
                <EditTournament />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Footer />
      </Router>
    </AuthProvider>
  );
}

export default App;