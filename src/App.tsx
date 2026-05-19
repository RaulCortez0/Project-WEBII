import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Core/Home";
import Register from "./pages/Auth/Register";
import Login from "./pages/Auth/Login";
import About from "./pages/Core/About";
import TournamentManager from "./pages/Tournaments/TournamentManager";
import AllTournaments from "./pages/Tournaments/AllTournaments";
import CreateTournament from "./pages/Tournaments/CreateTournament";
import EditTournament from "./pages/Tournaments/EditTournament";
import TournamentDetail from "./pages/Tournaments/TournamentDetail";
import Profile from "./pages/Core/Profile";
import OAuthCallback from "./pages/Auth/OAuthCallback";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import TournamentBracket from "./pages/Tournaments/TournamentBracket";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";
import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <>
      <AuthProvider>
        <Router>
          <Navbar />
          <Routes>
            {/* Rutas públicas */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/torneos" element={<AllTournaments />} />
            <Route path="/torneo/:id" element={<TournamentDetail />} />
            <Route path="/torneo/:id/bracket" element={<TournamentBracket />} />
            <Route path="/oauth-callback" element={<OAuthCallback />} />

            {/* Solo para usuarios NO autenticados */}
            <Route path="/registro" element={<GuestRoute><Register /></GuestRoute>} />
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />

            {/* Rutas protegidas — requieren sesión */}
            <Route path="/gestion-torneos" element={<ProtectedRoute><TournamentManager /></ProtectedRoute>} />
            <Route path="/crear-torneo" element={<ProtectedRoute><CreateTournament /></ProtectedRoute>} />
            <Route path="/editar-torneo" element={<ProtectedRoute><EditTournament /></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          </Routes>
          <Footer />
        </Router>
      </AuthProvider>
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </>
  );
}

export default App;