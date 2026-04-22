import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">
        <img src="/BC_Logo.png" alt="BracketCore" className="logo-image" />
      </Link>

      <div className="nav-links">
        <Link to="/">Inicio</Link>
        <Link to="/about">Acerca de</Link>
        <Link to="/torneos">Torneos</Link>
        {isLoggedIn && (
          <Link to="/gestion-torneos">Gestión</Link>
        )}
        <a href="#">API</a>
      </div>

      <div className="nav-right">
        {isLoggedIn ? (
          <>
            <span className="nav-username">👤 {user?.username}</span>
            <button className="nav-btn logout-btn" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="login-link">
              Iniciar sesión
            </Link>
            <Link to="/registro" className="nav-btn">
              Registrarse
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;