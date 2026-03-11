import { useState } from "react";
import { Link } from "react-router-dom";
import "./Login.css";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const [errors, setErrors] = useState({
    email: "",
    password: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      email: "",
      password: ""
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = "El email es requerido";
      isValid = false;
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Email inválido";
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      console.log("Login:", formData);
      alert("¡Login exitoso!");
    }
  };

  return (
    <main className="login-page">
      <div className="login-container">
        <div className="login-left">
          <h1>BRACKETCORE</h1>
          <h2>Bienvenido de vuelta</h2>
          <p>
            Accede a tu cuenta para gestionar tus torneos, 
            ver estadísticas y conectar con la comunidad.
          </p>
          
          <div className="login-features">
            <div className="feature">
              <span className="feature-icon">🏆</span>
              <div>
                <h4>Tus torneos</h4>
                <p>Administra todos tus torneos en un lugar</p>
              </div>
            </div>
            
            <div className="feature">
              <span className="feature-icon">📈</span>
              <div>
                <h4>Estadísticas</h4>
                <p>Sigue tu progreso y rendimiento</p>
              </div>
            </div>
          </div>
        </div>

        <div className="login-right">
          <form onSubmit={handleSubmit} className="login-form">
            <h2>Iniciar sesión</h2>
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                className={errors.email ? "error" : ""}
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={errors.password ? "error" : ""}
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-options">
              <div className="remember-me">
                <input type="checkbox" id="remember" />
                <label htmlFor="remember">Recordarme</label>
              </div>
              <a href="#" className="forgot-password">¿Olvidaste tu contraseña?</a>
            </div>

            <button type="submit" className="login-submit-btn">
              INICIAR SESIÓN
            </button>

            <div className="login-register">
              ¿No tienes cuenta? <Link to="/registro">Regístrate gratis</Link>
            </div>

            <div className="login-divider">
              <span>O continúa con</span>
            </div>

            <div className="social-login">
              <button type="button" className="social-btn google">Google</button>
              <button type="button" className="social-btn github">GitHub</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

export default Login;