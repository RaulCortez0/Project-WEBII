import { useState } from "react";
import { Link } from "react-router-dom";
import "./Register.css";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [errors, setErrors] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error del campo cuando el usuario empieza a escribir
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
      username: "",
      email: "",
      password: "",
      confirmPassword: ""
    };

    // Validar username
    if (!formData.username.trim()) {
      newErrors.username = "El nombre de usuario es requerido";
      isValid = false;
    } else if (formData.username.length < 3) {
      newErrors.username = "El nombre de usuario debe tener al menos 3 caracteres";
      isValid = false;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = "El email es requerido";
      isValid = false;
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Email inválido";
      isValid = false;
    }

    // Validar password
    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
      isValid = false;
    }

    // Validar confirmación de password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirma tu contraseña";
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      console.log("Formulario válido:", formData);
      // Aquí iría la llamada a tu API de registro
      alert("¡Registro exitoso!");
    }
  };

  return (
    <main className="register-page">
      <div className="register-container">
        <div className="register-left">
          <h1>BRACKETCORE</h1>
          <h2>Únete a la comunidad</h2>
          <p>
            Crea tu cuenta gratis y comienza a gestionar torneos,
            participar en competencias y conectar con jugadores de todo el mundo.
          </p>
          
          <div className="register-features">
            <div className="feature">
              <span className="feature-icon">🎮</span>
              <div>
                <h4>Crea torneos ilimitados</h4>
                <p>Organiza torneos de cualquier tamaño</p>
              </div>
            </div>
            
            <div className="feature">
              <span className="feature-icon">📊</span>
              <div>
                <h4>Estadísticas en tiempo real</h4>
                <p>Sigue el progreso de tus torneos</p>
              </div>
            </div>
            
            <div className="feature">
              <span className="feature-icon">🌍</span>
              <div>
                <h4>Comunidad global</h4>
                <p>Conecta con jugadores de todo el mundo</p>
              </div>
            </div>
          </div>
        </div>

        <div className="register-right">
          <form onSubmit={handleSubmit} className="register-form">
            <h2>Crear cuenta</h2>
            
            <div className="form-group">
              <label htmlFor="username">Nombre de usuario</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Tu nombre de usuario"
                className={errors.username ? "error" : ""}
              />
              {errors.username && <span className="error-message">{errors.username}</span>}
            </div>

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

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar contraseña</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={errors.confirmPassword ? "error" : ""}
              />
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>

            <div className="form-terms">
              <input type="checkbox" id="terms" required />
              <label htmlFor="terms">
                Acepto los <a href="#">Términos de servicio</a> y la{" "}
                <a href="#">Política de privacidad</a>
              </label>
            </div>

            <button type="submit" className="register-submit-btn">
              REGISTRARSE
            </button>

            <div className="register-login">
                ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
            </div>

            <div className="register-divider">
              <span>O regístrate con</span>
            </div>

            <div className="social-register">
              <button type="button" className="social-btn google">
                Google
              </button>
              <button type="button" className="social-btn github">
                GitHub
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

export default Register;