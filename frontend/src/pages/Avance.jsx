import React from "react";
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Divider,
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

function agruparProgramas(rows) {
    const programas = new Map();

    rows.forEach((row) => {
        if (!programas.has(row.NombrePrograma)) {
            programas.set(row.NombrePrograma, {
                nombre: row.NombrePrograma,
                fin: row.FinNarrativo,
                proposito: row.PropositoNarrativo,
                metas: new Map(),
            });
        }

        const programa = programas.get(row.NombrePrograma);
        if (!programa.metas.has(row.IdMeta)) {
            programa.metas.set(row.IdMeta, {
                id: row.IdMeta,
                numero: row.NumeroMeta,
                descripcion: row.DescripcionMeta,
                acciones: new Map(),
            });
        }

        const meta = programa.metas.get(row.IdMeta);
        if (!meta.acciones.has(row.IdAccion)) {
            meta.acciones.set(row.IdAccion, {
                id: row.IdAccion,
                numero: row.NumeroAccion,
                descripcion: row.DescripcionAccion,
                unidadMedida: row.UnidadMedida,
                unidadEjecutora: row.UnidadEjecutora,
                anual: row.Anual,
                renglones: [],
            });
        }

        meta.acciones.get(row.IdAccion).renglones.push(row);
    });

    return [...programas.values()].map((programa) => ({
        ...programa,
        metas: [...programa.metas.values()].map((meta) => ({
            ...meta,
            acciones: [...meta.acciones.values()],
        })),
    }));
}

function TablaMensual({ accion }) {
    return (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 420 }}>
            <Table stickyHeader size="small" sx={{ minWidth: 1400 }}>
                <TableHead>
                    <TableRow>
                        {[
                            ["Concepto", 135],
                            ["Anual", 100],
                            ...meses.map(([, nombre]) => [nombre, 80]),
                            ["Total", 100],
                        ].map(([label, width]) => (
                            <TableCell
                                key={label}
                                align={label === "Concepto" ? "left" : "right"}
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
                    {accion.renglones.map((row) => (
                        <TableRow key={`${row.IdAccion}-${row.Concepto}`} hover>
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
    );
}

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
    const unidades = data?.unidades?.map((unidad) => unidad.NombreUnidad)
        ?? [...new Set(rows.map((row) => row.UnidadEjecutora))];
    const programas = agruparProgramas(rows);

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
                    {rows.length === 0 ? (
                        <Alert severity="info">
                            No hay acciones programadas para {unidades.length ? unidades.join(", ") : "esta unidad"} en el ejercicio fiscal {data.ejercicio}.
                        </Alert>
                    ) : (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            {programas.map((programa) => (
                                <Paper key={programa.nombre} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
                                    <Typography variant="overline" color="text.secondary">
                                        Programa
                                    </Typography>
                                    <Typography variant="h5" fontWeight={700} color="var(--text-headers)" sx={{ mb: 2 }}>
                                        {programa.nombre}
                                    </Typography>

                                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ width: "20%", fontWeight: 700, backgroundColor: "#eaf1f6", color: "#23435c" }}>
                                                        Elemento
                                                    </TableCell>
                                                    <TableCell sx={{ fontWeight: 700, backgroundColor: "#eaf1f6", color: "#23435c" }}>
                                                        Resumen narrativo
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700 }}>FIN</TableCell>
                                                    <TableCell sx={{ whiteSpace: "normal" }}>{programa.fin || "Sin resumen narrativo"}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700 }}>PROPÓSITO</TableCell>
                                                    <TableCell sx={{ whiteSpace: "normal" }}>{programa.proposito || "Sin resumen narrativo"}</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </TableContainer>

                                    {programa.metas.map((meta, metaIndex) => (
                                        <Box key={meta.id} sx={{ mb: metaIndex === programa.metas.length - 1 ? 0 : 3 }}>
                                            {metaIndex > 0 && <Divider sx={{ mb: 3 }} />}
                                            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                                                Meta {meta.numero}
                                            </Typography>
                                            <Typography sx={{ mb: 2, whiteSpace: "pre-line" }}>
                                                {meta.descripcion}
                                            </Typography>

                                            {meta.acciones.map((accion) => (
                                                <Box key={accion.id} sx={{ mb: 2.5, "&:last-child": { mb: 0 } }}>
                                                    <Typography variant="subtitle1" fontWeight={700}>
                                                        Acción {accion.numero}
                                                    </Typography>
                                                    <Typography sx={{ mb: 1.5, whiteSpace: "pre-line" }}>
                                                        {accion.descripcion}
                                                    </Typography>

                                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 1.5 }}>
                                                        <Box sx={{ flex: "1 1 240px" }}>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Unidad de medida
                                                            </Typography>
                                                            <Typography fontWeight={600}>{accion.unidadMedida}</Typography>
                                                        </Box>
                                                        <Box sx={{ flex: "1 1 240px" }}>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Unidad ejecutora
                                                            </Typography>
                                                            <Typography fontWeight={600}>{accion.unidadEjecutora}</Typography>
                                                        </Box>
                                                    </Box>
                                                    <TablaMensual accion={accion} />
                                                </Box>
                                            ))}
                                        </Box>
                                    ))}
                                </Paper>
                            ))}
                        </Box>
                    )}
                </>
            ) : null}
        </Box>
    );
}
