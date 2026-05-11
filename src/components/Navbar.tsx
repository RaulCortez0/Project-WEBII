import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useAuth();

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
        <a href="#">Acerca de</a>
        <a href="#">API</a>
      </div>

      <div className="nav-right">
        {isLoggedIn ? (
          <>
            <Link to="/perfil" className="nav-username">
              👤 {user?.username}
            </Link>
            <button onClick={handleLogout} className="nav-btn logout-btn">
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