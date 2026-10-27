import React, { useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { useNavigate } from "react-router-dom";
import ConfirmModal from "./modals/ConfirmModal";

export default function LogoutButton() {
    const [openConfirm, setOpenConfirm] = useState(false);
    const [openSuccess, setOpenSuccess] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        // Borrar datos
        localStorage.removeItem("token");
        localStorage.setItem("isLoggedIn", "false");
        localStorage.removeItem("usuario");

        setOpenConfirm(false);
        setTimeout(() => {
            setOpenSuccess(true);
        }, 400);
    };

    const handleSuccessClose = () => {
        setOpenSuccess(false);
        navigate("/login");
    };

    return (
        <>
            <Tooltip title="Cerrar sesión">
                <IconButton
                    sx={{ color: "var(--buttons)" }}
                    onClick={() => setOpenConfirm(true)}
                >
                    <LogoutIcon />
                </IconButton>
            </Tooltip>

            {/* MODAL CONFIRMAR */}
            <ConfirmModal
                open={openConfirm}
                onClose={() => setOpenConfirm(false)}
                onConfirm={handleLogout}
                message="¿Estás seguro de que quieres cerrar sesión?"
                icon={WarningAmberRoundedIcon}
                iconColor="#ff9800"
            />

            {/* MODAL ÉXITO */}
            <ConfirmModal
                open={openSuccess}
                onClose={handleSuccessClose}
                message="Su sesión se ha cerrado con éxito"
                icon={CheckCircleRoundedIcon}
                iconColor="#2e7d32"
                hideActions
                autoClose
                autoCloseTime={2000}
            />
        </>
    );
}