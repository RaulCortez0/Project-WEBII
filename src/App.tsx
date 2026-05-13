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
import Profile from "./pages/Profile";
import OAuthCallback from "./pages/OAuthCallback";
import AdminDashboard from "./pages/AdminDashboard";
import TournamentBracket from "./pages/TournamentBracket";
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