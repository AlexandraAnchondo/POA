import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL_DEV;

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// Obtener token y headers
const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// Manejo de errores comunes
const handleApiError = (err) => {
    console.error(err);
    if (err.response && err.response.status === 401) {
        localStorage.removeItem("token");
        localStorage.setItem("isLoggedIn", "false");
        window.location.href = "/template/login";
    }
    throw err;
};

// --- Funciones exportadas ---
export const login = async (usuario, contraseña) => {
    try {
        const response = await api.post("/login", { usuario, contraseña });
        return response.data;
    } catch (err) {
        throw err.response?.data || { error: "Error de red" };
    }
};

export const cambiarPassword = async (userId, nueva) => {
    try {
        const response = await api.post(
            "/cambiar_password",
            { userId, nueva },
            { headers: getAuthHeaders() }
        );
        return response.data;
    } catch (error) {
        throw error;
    }
};

//#region Scanner
export const iniciarScanner = async () => {
    try {
        const response = await api.post("/scanner/start");
        return response.data;
    } catch (err) {
        handleApiError(err);
    }
};

export const detenerScanner = async () => {
    try {
        const response = await api.post("/scanner/stop");
        return response.data;
    } catch (err) {
        handleApiError(err);
    }
};

export const escanearDocumento = async () => {
    try {
        // Primero aseguramos que el servicio esté activo
        await iniciarScanner();

        // Luego llamamos al microservicio
        const response = await fetch("http://localhost:5000/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                duplex: true,
                colorMode: "color"
            })
        });

        const data = await response.json();

        return data;

    } catch (err) {
        console.error(err);
        throw new Error("Error en el escaneo");
    }
};
// #endregion
