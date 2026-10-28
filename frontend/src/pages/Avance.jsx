import React from "react";
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import { obtenerAvanceUnidad } from "../data/API";

const meses = [
    ["ENE", "Ene"],
    ["FEB", "Feb"],
    ["MAR", "Mar"],
    ["ABR", "Abr"],
    ["MAY", "May"],
    ["JUN", "Jun"],
    ["JUL", "Jul"],
    ["AGO", "Ago"],
    ["SEP", "Sep"],
    ["OCT", "Oct"],
    ["NOV", "Nov"],
    ["DIC", "Dic"],
];

const formatearCantidad = (cantidad) =>
    cantidad == null
        ? "—"
        : new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(cantidad);

export default function Avance() {
    const [data, setData] = React.useState(null);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        let activo = true;

        obtenerAvanceUnidad()
            .then((resultado) => {
                if (activo) setData(resultado);
            })
            .catch((err) => {
                if (activo) {
                    setError(err.error || "No fue posible cargar el avance del POA.");
                }
            });

        return () => {
            activo = false;
        };
    }, []);

    const rows = data?.rows ?? [];
    const acciones = new Set(rows.map((row) => row.IdAccion)).size;
    const unidades = data?.unidades?.map((unidad) => unidad.NombreUnidad)
        ?? [...new Set(rows.map((row) => row.UnidadEjecutora))];

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: "var(--bg-main)", minHeight: "100%" }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" fontWeight={700} color="var(--text-headers)">
                    Avance del POA
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    Programación y resultados por acción · Ejercicio fiscal {data?.ejercicio ?? ""}
                </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {!data && !error ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : data ? (
                <>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
                        <Paper sx={{ p: 2.5, flex: "1 1 220px", borderRadius: 2 }}>
                            <Typography variant="body2" color="text.secondary">Unidad responsable</Typography>
                            <Typography variant="h6" fontWeight={700}>
                                {unidades.length ? unidades.join(", ") : "Sin acciones registradas"}
                            </Typography>
                        </Paper>
                        <Paper sx={{ p: 2.5, flex: "0 1 180px", borderRadius: 2 }}>
                            <Typography variant="body2" color="text.secondary">Acciones</Typography>
                            <Typography variant="h6" fontWeight={700}>{acciones}</Typography>
                        </Paper>
                        <Paper sx={{ p: 2.5, flex: "0 1 180px", borderRadius: 2 }}>
                            <Typography variant="body2" color="text.secondary">Renglones</Typography>
                            <Typography variant="h6" fontWeight={700}>{rows.length}</Typography>
                        </Paper>
                    </Box>

                    {rows.length === 0 ? (
                        <Alert severity="info">
                            No hay acciones programadas para esta unidad en el ejercicio fiscal {data.ejercicio}.
                        </Alert>
                    ) : (
                        <TableContainer component={Paper} sx={{ borderRadius: 2, maxHeight: "calc(100vh - 330px)" }}>
                            <Table stickyHeader size="small" sx={{ minWidth: 1800 }}>
                                <TableHead>
                                    <TableRow>
                                        {[
                                            ["Programa", 180],
                                            ["Meta", 65],
                                            ["Acción", 70],
                                            ["Descripción de la acción", 300],
                                            ["Unidad de medida", 130],
                                            ["Unidad ejecutora", 180],
                                            ["Concepto", 120],
                                            ["Anual", 100],
                                            ...meses.map(([, nombre]) => [nombre, 80]),
                                            ["Total", 100],
                                        ].map(([label, width]) => (
                                            <TableCell
                                                key={label}
                                                align={meses.some(([, nombre]) => nombre === label) || ["Anual", "Total"].includes(label) ? "right" : "left"}
                                                sx={{
                                                    minWidth: width,
                                                    fontWeight: 700,
                                                    backgroundColor: "#eaf1f6",
                                                    color: "#23435c",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {label}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((row) => (
                                        <TableRow
                                            key={`${row.IdAccion}-${row.Concepto}`}
                                            hover
                                            sx={{
                                                "&:nth-of-type(even)": { backgroundColor: "rgba(0, 0, 0, 0.025)" },
                                            }}
                                        >
                                            <TableCell>{row.NombrePrograma}</TableCell>
                                            <TableCell align="center">{row.NumeroMeta}</TableCell>
                                            <TableCell align="center">{row.NumeroAccion}</TableCell>
                                            <TableCell sx={{ minWidth: 300, whiteSpace: "normal" }}>
                                                {row.DescripcionAccion}
                                            </TableCell>
                                            <TableCell>{row.UnidadMedida}</TableCell>
                                            <TableCell>{row.UnidadEjecutora}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={row.Concepto === "PROGRAMADO" ? "Programado" : "Realizado"}
                                                    color={row.Concepto === "PROGRAMADO" ? "primary" : "success"}
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell align="right">{formatearCantidad(row.Anual)}</TableCell>
                                            {meses.map(([mes]) => (
                                                <TableCell key={mes} align="right">
                                                    {formatearCantidad(row[mes])}
                                                </TableCell>
                                            ))}
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                {formatearCantidad(row.TOTAL)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </>
            ) : null}
        </Box>
    );
}
