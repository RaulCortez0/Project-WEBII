import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import About from "./pages/About";
import TournamentManager from "./pages/TournamentManager";
import AllTournaments from "./pages/AllTournaments";
import CreateTournament from "./pages/CreateTournament";
import EditTournament from "./pages/EditTournament";
import Footer from "./components/Footer";
import "./App.css";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/registro" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<About />} />
        <Route path="/gestion-torneos" element={<TournamentManager />} />
        <Route path="/torneos" element={<AllTournaments />} />
        <Route path="/crear-torneo" element={<CreateTournament />} />
        <Route path="/editar-torneo" element={<EditTournament />} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;