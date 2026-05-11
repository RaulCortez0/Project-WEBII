import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userParam = params.get("user");

    if (userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        login(user);
        navigate("/");
      } catch {
        navigate("/login");
      }
    } else {
      navigate("/login");
    }
  }, [navigate, login]);

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "60vh",
      color: "#00ccff",
      fontSize: "18px"
    }}>
      Iniciando sesión...
    </div>
  );
};

export default OAuthCallback;
