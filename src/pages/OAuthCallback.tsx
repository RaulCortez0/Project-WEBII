import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const userParam = searchParams.get("user");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError("Error al autenticarse con el proveedor. Intenta de nuevo.");
      setTimeout(() => navigate("/login"), 3000);
      return;
    }

    if (userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        login(userData);
        navigate("/");
      } catch {
        setError("Error al procesar los datos de autenticación.");
        setTimeout(() => navigate("/login"), 3000);
      }
    } else {
      navigate("/login");
    }
  }, [searchParams, login, navigate]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "#0f0f1a",
      color: "#fff",
      fontFamily: "Inter, sans-serif",
      gap: "1.5rem"
    }}>
      {error ? (
        <>
          <div style={{ fontSize: "2.5rem" }}>❌</div>
          <h2 style={{ color: "#ef4444", margin: 0 }}>Error de autenticación</h2>
          <p style={{ color: "#94a3b8", margin: 0 }}>{error}</p>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Redirigiendo al login...</p>
        </>
      ) : (
        <>
          <div style={{
            width: "48px",
            height: "48px",
            border: "3px solid #6366f1",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite"
          }} />
          <h2 style={{ margin: 0, color: "#e2e8f0" }}>Autenticando...</h2>
          <p style={{ color: "#94a3b8", margin: 0 }}>Iniciando tu sesión, por favor espera</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </div>
  );
};

export default OAuthCallback;
