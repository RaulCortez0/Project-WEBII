import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-links">
          <a href="#">Contacto</a>
          <span>|</span>
          <a href="#">Términos</a>
          <span>|</span>
          <a href="#">Privacidad</a>
        </div>

        <div className="footer-copyright">
          © 2026 BracketCore
        </div>

      </div>
    </footer>
  );
};

export default Footer;