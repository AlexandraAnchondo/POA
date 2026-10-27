import React, { useEffect } from "react";
import { Modal, Box, Typography, Button } from "@mui/material";
import { motion } from "framer-motion";
import "../../styles/modal.css";

export default function ConfirmModal({
    open,
    onClose,
    onConfirm,
    message,
    icon: Icon,
    iconColor = "#ff9800",
    hideActions = false,
    autoClose = false,
    autoCloseTime = 2000,
}) {

    useEffect(() => {
        if (open && autoClose) {
            const timer = setTimeout(() => {
                onClose?.();
            }, autoCloseTime);

            return () => clearTimeout(timer);
        }
    }, [open, autoClose, autoCloseTime, onClose]);

    return (
        <Modal
            open={open}
            onClose={onClose}
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(6px)",
                backgroundColor: "rgba(0,0,0,0.4)",
            }}
        >
            <Box
                component={motion.div}
                initial={{ scale: 0.5, y: -100, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.5, y: 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                sx={{
                    borderRadius: 6,
                    boxShadow: "0 15px 40px rgba(0,0,0,0.35)",
                    p: 5,
                    width: 420,
                    textAlign: "center",
                    background: "var(--background-color)",
                }}
            >
                {/* ICONO DINÁMICO */}
                {Icon && (
                    <Box
                        component={motion.div}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            repeatDelay: 2,
                        }}
                        sx={{ display: "flex", justifyContent: "center", mb: 2 }}
                    >
                        <Icon
                            sx={{
                                fontSize: 70,
                                color: iconColor,
                            }}
                        />
                    </Box>
                )}

                <Typography variant="h5" fontWeight="bold" mb={2}>
                    {message}
                </Typography>

                {!hideActions && (
                    <Box mt={3} display="flex" justifyContent="center" gap={3}>
                        <Button
                            variant="contained"
                            onClick={() => {
                                onConfirm?.();
                            }}
                            component={motion.button}
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            sx={{
                                backgroundColor: "#2e7d32",
                                fontWeight: "bold",
                                borderRadius: 3,
                                px: 3,
                                py: 1.2,
                            }}
                        >
                            Confirmar
                        </Button>

                        <Button
                            variant="contained"
                            onClick={onClose}
                            component={motion.button}
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            sx={{
                                backgroundColor: "#e53935",
                                fontWeight: "bold",
                                borderRadius: 3,
                                px: 3,
                                py: 1.2,
                            }}
                        >
                            Cancelar
                        </Button>
                    </Box>
                )}
            </Box>
        </Modal>
    );
}