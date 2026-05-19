import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Profile.css";

const Profile = () => {
    const navigate = useNavigate();
    const { user, isLoggedIn, updateUser } = useAuth();

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        newPassword: "",
        confirmPassword: ""
    });

    const [errors, setErrors] = useState({
        username: "",
        email: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [apiError, setApiError] = useState("");
    const [apiSuccess, setApiSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    // Redirigir si no está logueado
    useEffect(() => {
        if (!isLoggedIn) {
            navigate("/login");
        }
    }, [isLoggedIn, navigate]);

    // Cargar datos del usuario
    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || "",
                email: user.email || "",
                newPassword: "",
                confirmPassword: ""
            });
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof typeof errors]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
        setApiError("");
        setApiSuccess("");
    };

    const validateForm = () => {
        let isValid = true;
        const newErrors = { username: "", email: "", newPassword: "", confirmPassword: "" };

        if (!formData.username.trim()) {
            newErrors.username = "El nombre de usuario es requerido";
            isValid = false;
        } else if (formData.username.length < 3) {
            newErrors.username = "El nombre debe tener al menos 3 caracteres";
            isValid = false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email) {
            newErrors.email = "El email es requerido";
            isValid = false;
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = "Email inválido";
            isValid = false;
        }

        if (formData.newPassword && formData.newPassword.length < 6) {
            newErrors.newPassword = "La contraseña debe tener al menos 6 caracteres";
            isValid = false;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            newErrors.confirmPassword = "Las contraseñas no coinciden";
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        setApiError("");
        setApiSuccess("");

        try {
            const updateData: any = {
                username: formData.username,
                email: formData.email
            };

            if (formData.newPassword) {
                updateData.password = formData.newPassword;
            }

            const response = await fetch(`http://localhost:3001/usuarios/${user?.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateData)
            });

            const data = await response.json();

            if (!response.ok) {
                setApiError(data.error || "Error al actualizar el perfil");
                return;
            }

            // Actualizar el contexto con los nuevos datos del usuario
            updateUser(data.user);

            setApiSuccess("Perfil actualizado correctamente");
            setFormData(prev => ({ ...prev, newPassword: "", confirmPassword: "" }));

            setTimeout(() => setApiSuccess(""), 3000);
        } catch (err) {
            setApiError("No se pudo conectar al servidor. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    if (!isLoggedIn) {
        return null;
    }

    return (
        <main className="profile-page">
            <div className="profile-container">
                <div className="profile-left">
                    <h1>BRACKETCORE</h1>
                    <h2>Mi Perfil</h2>
                    <p>
                        Gestiona tu información personal y mantén tus datos seguros.
                    </p>

                    <div className="profile-features">
                        <div className="feature">
                            <span className="feature-icon">👤</span>
                            <div>
                                <h4>Datos personales</h4>
                                <p>Actualiza tu nombre y email</p>
                            </div>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">🔒</span>
                            <div>
                                <h4>Seguridad</h4>
                                <p>Cambia tu contraseña cuando lo necesites</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-right">
                    <form onSubmit={handleSubmit} className="profile-form">
                        <h2>Editar perfil</h2>

                        {apiError && (
                            <div className="api-error-message">
                                {apiError}
                            </div>
                        )}

                        {apiSuccess && (
                            <div className="api-success-message">
                                {apiSuccess}
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="username">Nombre de usuario *</label>
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
                            <label htmlFor="email">Correo electrónico *</label>
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
                            <label htmlFor="newPassword">Nueva contraseña</label>
                            <input
                                type="password"
                                id="newPassword"
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleChange}
                                placeholder="Dejar en blanco para mantener la actual"
                                className={errors.newPassword ? "error" : ""}
                            />
                            {errors.newPassword && <span className="error-message">{errors.newPassword}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirmar nueva contraseña</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirmar nueva contraseña"
                                className={errors.confirmPassword ? "error" : ""}
                            />
                            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                        </div>

                        <button
                            type="submit"
                            className="profile-submit-btn"
                            disabled={loading}
                        >
                            {loading ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
};

export default Profile;
