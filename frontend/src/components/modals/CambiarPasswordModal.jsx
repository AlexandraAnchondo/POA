import React, { useState } from "react";
import {
    Modal,
    Box,
    TextField,
    Typography,
    Button,
    IconButton,
    InputAdornment
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import {
    Visibility,
    VisibilityOff
} from "@mui/icons-material";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import { cambiarPassword } from "../../data/API";

export default function CambiarPasswordModal({ open, onClose }) {
    const [nueva, setNueva] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showNueva, setShowNueva] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const userId = JSON.parse(localStorage.getItem("id_usuario"));

    const handleChangePassword = async () => {
        setError("");
        setSuccess("");

        if (!nueva.trim() || !confirm.trim())
            return setError("Por favor completa todos los campos");

        if (nueva.length < 8)
            return setError("Debe tener al menos 8 caracteres");

        if (!/[A-Z]/.test(nueva))
            return setError("Debe incluir una mayúscula");

        if (!/[0-9]/.test(nueva))
            return setError("Debe incluir un número");

        if (!/[!@#$%^&*]/.test(nueva))
            return setError("Debe incluir un símbolo especial");

        if (nueva !== confirm)
            return setError("Las contraseñas no coinciden");

        try {
            await cambiarPassword(userId, nueva);
            setSuccess("Contraseña actualizada correctamente ✅");
            setNueva("");
            setConfirm("");
            setTimeout(onClose, 1500);
        } catch (err) {
            setError("Hubo un error al actualizar la contraseña");
        }
    };

    const handleClose = () => {
        setError("");
        setSuccess("");
        setNueva("");
        setConfirm("");
        onClose();
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(6px)",
                backgroundColor: "rgba(0,0,0,0.4)"
            }}
        >
            <Box
                component={motion.div}
                initial={{ scale: 0.6, y: -100, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.6, y: 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                sx={{
                    borderRadius: 5,
                    boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                    p: 5,
                    width: { xs: "90%", sm: 420 },
                    textAlign: "center",
                    background: "var(--background-color) !important"
                }}
            >
                {/* ICONO ANIMADO */}
                <Box
                    component={motion.div}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatDelay: 2
                    }}
                    sx={{ mb: 2 }}
                >
                    <LockRoundedIcon
                        sx={{
                            fontSize: 65,
                            color: "#1976d2",
                        }}
                    />
                </Box>

                <Typography variant="h5" fontWeight="bold" mb={1}>
                    Cambiar contraseña
                </Typography>

                <Typography
                    variant="body2"
                    sx={{ mb: 2, color: "text.secondary" }}
                >
                    Mínimo 8 caracteres, una mayúscula, un número y un símbolo.
                </Typography>

                <TextField
                    fullWidth
                    label="Nueva contraseña"
                    type={showNueva ? "text" : "password"}
                    margin="normal"
                    value={nueva}
                    onChange={(e) => setNueva(e.target.value)}
                    component={motion.div}
                    whileFocus={{ scale: 1.02 }}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton onClick={() => setShowNueva(!showNueva)}>
                                    {showNueva ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                />

                <TextField
                    fullWidth
                    label="Confirmar contraseña"
                    type={showConfirm ? "text" : "password"}
                    margin="normal"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    component={motion.div}
                    whileFocus={{ scale: 1.02 }}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton onClick={() => setShowConfirm(!showConfirm)}>
                                    {showConfirm ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                />

                {/* MENSAJES ANIMADOS */}
                <AnimatePresence>
                    {error && (
                        <Typography
                            component={motion.p}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            color="error"
                            sx={{ mt: 2 }}
                        >
                            {error}
                        </Typography>
                    )}

                    {success && (
                        <Typography
                            component={motion.p}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            sx={{ mt: 2, color: "green" }}
                        >
                            {success}
                        </Typography>
                    )}
                </AnimatePresence>

                <Box mt={4} display="flex" justifyContent="center" gap={3}>
                    <Button
                        variant="contained"
                        onClick={handleChangePassword}
                        component={motion.button}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        sx={{
                            backgroundColor: "#2e7d32",
                            fontWeight: "bold",
                            borderRadius: 3,
                            px: 3,
                            py: 1.2,
                            "&:hover": {
                                backgroundColor: "#1b5e20"
                            }
                        }}
                    >
                        Guardar
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleClose}
                        component={motion.button}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        sx={{
                            backgroundColor: "#e53935",
                            fontWeight: "bold",
                            borderRadius: 3,
                            px: 3,
                            py: 1.2,
                            "&:hover": {
                                backgroundColor: "#c62828"
                            }
                        }}
                    >
                        Cancelar
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
}