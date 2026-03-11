import { Link } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
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
        <Link to="/login" className="login-link">
          Iniciar sesión
        </Link>
        <Link to="/registro" className="nav-btn">
          Registrarse
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;