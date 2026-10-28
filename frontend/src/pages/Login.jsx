import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Person,
  Lock
} from "@mui/icons-material";
import logo from "../assets/logo_congreso.png";
import { login } from "../data/API";

const Login = () => {
  const [usuario, setUsuario] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const data = await login(usuario, contraseña);

      localStorage.setItem("token", data.token);
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("usuario", usuario);
      localStorage.setItem("id_usuario", data.userId);
      localStorage.setItem(
        "tieneUnidadResponsable",
        String(data.unidadesResponsables?.length > 0)
      );

      window.location.href = "/poa/inicio";
    } catch (err) {
      setError(err.error);
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: " #f2f1f2"
      }}
    >
      <Paper
        elevation={10}
        sx={{
          width: 400,
          p: 5,
          borderRadius: 4,
          textAlign: "center",
          backdropFilter: "blur(10px)"
        }}
      >
        <Box
          component="img"
          src={logo}
          alt="Logo Congreso"
          sx={{ width: 230, mb: 2 }}
        />

        <Typography variant="h5" fontWeight="bold">
          POA
        </Typography>

        <Typography variant="h6" color="text.secondary" mb={3} mt={1}>
          Inicio de Sesión
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Usuario"
            variant="outlined"
            margin="normal"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person />
                </InputAdornment>
              )
            }}
            required
          />

          <TextField
            fullWidth
            label="Contraseña"
            type={showPassword ? "text" : "password"}
            variant="outlined"
            margin="normal"
            value={contraseña}
            onChange={(e) => setContraseña(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            required
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 3,
              py: 1.3,
              fontWeight: "bold",
              fontSize: "1rem",
              borderRadius: 2,
              backgroundColor: "var(--button-view-more)",
              color: "#fff !important",
              "&:hover": {
                backgroundColor: "var(--option-selected-text-color)"
              }
            }}
          >
            Entrar
          </Button>

          <Typography variant="subtitle1" color="text.secondary" mb={1} sx={{
            mt: 3,
            fontWeight: "bold"
          }}>
            ¿No tienes una cuenta?
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" mb={3}>
            Contacta al departamento de informática
          </Typography>
        </form>
      </Paper>
      <Typography variant="subtitle2" color="text.secondary" mt={8}>
        © {new Date().getFullYear()} Poder Legislativo del Estado de Baja California.
      </Typography>
    </Box>

  );
};

export default Login;
