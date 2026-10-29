import React from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { strToU8, zipSync } from "fflate";
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
        if (!programas.has(row.IdPrograma)) {
            programas.set(row.IdPrograma, {
                id: row.IdPrograma,
                nombre: row.NombrePrograma,
                fin: row.FinNarrativo,
                proposito: row.PropositoNarrativo,
                metas: new Map(),
            });
        }

        const programa = programas.get(row.IdPrograma);
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

function nombreHojaDisponible(nombre, nombresUsados) {
    const base = (nombre || "Programa")
        .replace(/[\\/*?:[\]]/g, " ")
        .trim()
        .replace(/^'+|'+$/g, "")
        .slice(0, 31) || "Programa";
    let nombreHoja = base;
    let consecutivo = 2;

    while (nombresUsados.has(nombreHoja.toLowerCase())) {
        const sufijo = ` (${consecutivo})`;
        nombreHoja = `${base.slice(0, 31 - sufijo.length)}${sufijo}`;
        consecutivo += 1;
    }

    nombresUsados.add(nombreHoja.toLowerCase());
    return nombreHoja;
}

function escaparXml(valor) {
    return String(valor)
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function columnaExcel(numero) {
    let columna = "";
    let restante = numero;

    while (restante > 0) {
        const indice = (restante - 1) % 26;
        columna = String.fromCharCode(65 + indice) + columna;
        restante = Math.floor((restante - 1) / 26);
    }

    return columna;
}

function crearXmlHoja(filas, combinaciones, anchos) {
    const celdasXml = filas.map(({ valores, estilos, alto }, indiceFila) => {
        const numeroFila = indiceFila + 1;
        const celdas = valores.map((valor, indiceColumna) => {
            const estilo = estilos[indiceColumna];
            if (valor == null && !estilo) return "";

            const referencia = `${columnaExcel(indiceColumna + 1)}${numeroFila}`;
            const atributoEstilo = estilo ? ` s="${estilo}"` : "";
            if (typeof valor === "number" && Number.isFinite(valor)) {
                return `<c r="${referencia}"${atributoEstilo}><v>${valor}</v></c>`;
            }

            if (valor == null) return `<c r="${referencia}"${atributoEstilo}/>`;
            if (Array.isArray(valor.runs)) {
                const runsXml = valor.runs.map(({ text, bold, color }) => (
                    `<r><rPr><rFont val="Calibri"/>${bold ? "<b/>" : ""}<color rgb="${color || "FF000000"}"/><sz val="10"/></rPr><t xml:space="preserve">${escaparXml(text)}</t></r>`
                )).join("");
                return `<c r="${referencia}"${atributoEstilo} t="inlineStr"><is>${runsXml}</is></c>`;
            }
            return `<c r="${referencia}"${atributoEstilo} t="inlineStr"><is><t xml:space="preserve">${escaparXml(valor)}</t></is></c>`;
        }).join("");

        return `<row r="${numeroFila}" ht="${alto}" customHeight="1">${celdas}</row>`;
    }).join("");
    const columnasXml = anchos.map((ancho, indice) => (
        `<col min="${indice + 1}" max="${indice + 1}" width="${ancho}" customWidth="1"/>`
    )).join("");
    const combinacionesXml = combinaciones.length
        ? `<mergeCells count="${combinaciones.length}">${combinaciones.map((rango) => `<mergeCell ref="${rango}"/>`).join("")}</mergeCells>`
        : "";

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:U${filas.length}"/>
<sheetViews><sheetView workbookViewId="0" view="pageBreakPreview" showGridLines="0"/></sheetViews>
<sheetFormatPr defaultRowHeight="20"/>
<cols>${columnasXml}</cols>
<sheetData>${celdasXml}</sheetData>
${combinacionesXml}
<printOptions horizontalCentered="1"/>
<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.15" footer="0.15"/>
<pageSetup paperSize="1" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
<drawing r:id="rId1"/>
</worksheet>`;
}

async function descargarReporteExcel(rows, ejercicio) {
    const respuestaLogo = await fetch(`${import.meta.env.BASE_URL}logo_congreso.png`);
    if (!respuestaLogo.ok) {
        throw new Error("No fue posible cargar el logo del Congreso.");
    }
    const respuestaLogo2 = await fetch(`${import.meta.env.BASE_URL}logoBC.png`);
    if (!respuestaLogo2.ok) {
        throw new Error("No fue posible cargar el logo de la Baja California.");
    }
    const logoCongreso = new Uint8Array(await respuestaLogo.arrayBuffer());
    const logoBC = new Uint8Array(await respuestaLogo2.arrayBuffer());
    const nombresUsados = new Set();
    const programas = agruparProgramas(rows);
    const mesesColumnas = meses.map(([, nombre]) => nombre);
    const anchos = [3, 26, 34, 6.2, 6.2, 6.2, 8, ...mesesColumnas.map(() => 5.8), 8, 14];
    const hojas = programas.map((programa) => {
        const nombreHoja = nombreHojaDisponible(programa.nombre, nombresUsados);
        const filas = [];
        const combinaciones = [];
        const agregarFila = (celdas, alto = 23) => {
            const valores = Array(21).fill(null);
            const estilos = Array(21).fill(0);

            celdas.forEach(([columnaInicio, valor, estilo, columnaFin = columnaInicio]) => {
                valores[columnaInicio - 1] = valor;
                for (let columna = columnaInicio; columna <= columnaFin; columna += 1) {
                    estilos[columna - 1] = estilo;
                }
                if (columnaFin > columnaInicio) {
                    const numeroFila = filas.length + 1;
                    combinaciones.push(
                        `${columnaExcel(columnaInicio)}${numeroFila}:${columnaExcel(columnaFin)}${numeroFila}`
                    );
                }
            });

            filas.push({ valores, estilos, alto });
        };
        const agregarSeparador = () => {
            agregarFila([[2, null, 17, 20]], 2);
        };
        const agregarRenglonAvance = (row) => {
            agregarFila([
                [3, row.Concepto === "PROGRAMADO" ? "PROGRAMADO" : "REALIZADO", 19, 6],
                [7, row.Anual, 14],
                ...meses.map(([mes], indice) => [8 + indice, row[mes], 16]),
                [20, row.TOTAL, 14],
            ], 23);
        };

        agregarFila([[2, "PODER LEGISLATIVO DEL ESTADO DE BAJA CALIFORNIA", 1, 16]], 27);
        agregarFila([[2, `PROGRAMA OPERATIVO ANUAL PARA EL EJERCICIO FISCAL ${ejercicio || 2026}`, 2, 16]], 25);
        agregarFila([], 8);
        agregarSeparador();

        agregarFila([
            [2, "PROGRAMA:", 3],
            [3, programa.nombre, 21, 20],
        ], 26);
        agregarFila([], 30);
        agregarSeparador();
        agregarFila([], 18);

        agregarFila([
            [2, "ELEMENTO", 22],
            [3, "RESUMEN NARRATIVO", 22, 20],
        ], 23);
        agregarFila([
            [2, "FIN", 6],
            [3, programa.fin || "Sin resumen narrativo", 6, 20],
        ], 52);
        agregarFila([
            [2, "PROPÓSITO", 6],
            [3, programa.proposito || "Sin resumen narrativo", 6, 20],
        ], 52);
        agregarFila([], 10);

        programa.metas.forEach((meta) => {
            agregarFila([
                [2, {
                    runs: [
                        { text: `META ${meta.numero}: `, bold: true, color: "FFFFFFFF" },
                        { text: meta.descripcion, bold: false, color: "FFFFFFFF" },
                    ],
                }, 7, 20],
            ], 34);
            agregarFila([], 18);

            meta.acciones.forEach((accion) => {
                const unidadEjecutora = accion.unidadEjecutora || "—";
                const altoFilaUnidades = Math.max(
                    25,
                    Math.ceil(unidadEjecutora.length / 24) * 15 + 8
                );
                agregarFila([
                    [3, {
                        runs: [
                            { text: `ACCIÓN ${accion.numero}: `, bold: true },
                            { text: accion.descripcion, bold: false },
                        ],
                    }, 8, 20],
                ], 44);
                agregarFila([
                    [3, "UNIDAD DE MEDIDA:", 25, 4],
                    [7, accion.unidadMedida || "—", 23, 6],
                    [14, "UNIDAD EJECUTORA:", 24, 16],
                    [17, unidadEjecutora, 23, 20],
                ], altoFilaUnidades);
                agregarFila([
                    [7, "ANUAL", 12],
                    ...mesesColumnas.map((nombre, indice) => [8 + indice, nombre, 11]),
                    [20, "TOTAL", 12],
                ], 25);

                accion.renglones.forEach(agregarRenglonAvance);
                agregarFila([], 24);
            });
        });

        return {
            nombre: nombreHoja,
            xml: crearXmlHoja(filas, combinaciones, anchos),
        };
    });

    const hojasXml = hojas.map((hoja, indice) => {
        const relacion = indice + 1;
        return `<sheet name="${escaparXml(hoja.nombre)}" sheetId="${relacion}" r:id="rId${relacion}"/>`;
    }).join("");
    const relacionesHojasXml = hojas.map((_, indice) => (
        `<Relationship Id="rId${indice + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${indice + 1}.xml"/>`
    )).join("");
    const tiposHojasXml = hojas.map((_, indice) => (
        `<Override PartName="/xl/worksheets/sheet${indice + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )).join("");
    const tiposDibujosXml = hojas.map((_, indice) => (
        `<Override PartName="/xl/drawings/drawing${indice + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`
    )).join("");
    const areasImpresionXml = hojas.map((hoja, indice) => (
        `<definedName name="_xlnm.Print_Area" localSheetId="${indice}">'${hoja.nombre.replace(/'/g, "''")}'!$A$1:$U$${hoja.xml.match(/<dimension ref="A1:U(\d+)"/)?.[1]}</definedName>`
    )).join("");
    const archivos = {
        "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${tiposHojasXml}
${tiposDibujosXml}
</Types>`),
        "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
        "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${hojasXml}</sheets>
<definedNames>${areasImpresionXml}</definedNames>
</workbook>`),
        "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${relacionesHojasXml}
<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
        "xl/styles.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="8">
<font><sz val="10"/><color rgb="FF000000"/><name val="Calibri"/></font>
<font><b/><sz val="14"/><color rgb="FF000000"/><name val="Calibri"/></font>
<font><b/><sz val="12"/><color rgb="FF000000"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="9"/><color rgb="FF000000"/><name val="Calibri"/></font>
<font><b/><sz val="8"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><color rgb="FF000000"/><name val="Calibri"/></font>
<font><b/><sz val="9"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
</fonts>
<fills count="6">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF800000"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFD6B894"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF6B0F2A"/></patternFill></fill>
</fills>
<borders count="3">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="26">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="5" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0" applyFill="1"/>
<xf numFmtId="0" fontId="4" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="6" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="6" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="7" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
</cellXfs>
</styleSheet>`),
    };

    hojas.forEach((hoja, indice) => {
        const numeroHoja = indice + 1;
        archivos[`xl/worksheets/sheet${indice + 1}.xml`] = strToU8(hoja.xml);
        archivos[`xl/worksheets/_rels/sheet${numeroHoja}.xml.rels`] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${numeroHoja}.xml"/>
</Relationships>`);
        archivos[`xl/drawings/drawing${numeroHoja}.xml`] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">

            <!-- Logo de Baja California: esquina superior izquierda -->
            <xdr:oneCellAnchor>
            <xdr:from>
            <xdr:col>1</xdr:col>
            <xdr:colOff>100000</xdr:colOff>
            <xdr:row>0</xdr:row>
            <xdr:rowOff>30000</xdr:rowOff>
            </xdr:from>
            <xdr:ext cx="500000" cy="700000"/>
            <xdr:pic>
            <xdr:nvPicPr>
            <xdr:cNvPr id="1" name="Logo Baja California"/>
            <xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr>
            </xdr:nvPicPr>
            <xdr:blipFill>
            <a:blip r:embed="rId2"/>
            <a:stretch><a:fillRect/></a:stretch>
            </xdr:blipFill>
            <xdr:spPr>
            <a:xfrm>
                <a:off x="0" y="0"/>
                <a:ext cx="500000" cy="700000"/>
            </a:xfrm>
            <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
            </xdr:spPr>
            </xdr:pic>
            <xdr:clientData/>
            </xdr:oneCellAnchor>

            
            <!-- Logo del Congreso: esquina superior derecha -->
            <xdr:oneCellAnchor>
                <xdr:from>
                    <xdr:col>15</xdr:col>
                    <xdr:colOff>100000</xdr:colOff>
                    <xdr:row>0</xdr:row>
                    <xdr:rowOff>30000</xdr:rowOff>
                </xdr:from>

                <!-- Tamaño aumentado aproximadamente 40 % -->
                <xdr:ext cx="2196275" cy="603400"/>

                <xdr:pic>
                    <xdr:nvPicPr>
                        <xdr:cNvPr id="2" name="Logo Congreso"/>
                        <xdr:cNvPicPr>
                            <a:picLocks noChangeAspect="1"/>
                        </xdr:cNvPicPr>
                    </xdr:nvPicPr>

                    <xdr:blipFill>
                        <a:blip r:embed="rId1"/>
                        <a:stretch>
                            <a:fillRect/>
                        </a:stretch>
                    </xdr:blipFill>

                    <xdr:spPr>
                        <a:xfrm>
                            <a:off x="0" y="0"/>
                            <a:ext cx="2196275" cy="603400"/>
                        </a:xfrm>
                        <a:prstGeom prst="rect">
                            <a:avLst/>
                        </a:prstGeom>
                    </xdr:spPr>
                </xdr:pic>

                <xdr:clientData/>
            </xdr:oneCellAnchor>

            </xdr:wsDr>`);

        archivos[`xl/drawings/_rels/drawing${numeroHoja}.xml.rels`] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image2.png"/>
</Relationships>`);

    });
    archivos["xl/media/image1.png"] = logoCongreso;
    archivos["xl/media/image2.png"] = logoBC;

    const archivo = new Blob([zipSync(archivos, { level: 6 })], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `Avance_POA_todas_las_unidades_${ejercicio}.xlsx`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    const [exportError, setExportError] = React.useState("");
    const [unidadSeleccionada, setUnidadSeleccionada] = React.useState("todas");
    const [exportando, setExportando] = React.useState(false);

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
    const unidades = data?.unidades ?? [];
    const rowsVisibles = data?.puedeVerTodasUnidades && unidadSeleccionada !== "todas"
        ? rows.filter((row) => String(row.IdUnidadResponsable) === unidadSeleccionada)
        : rows;
    const nombreUnidadSeleccionada = unidades.find(
        (unidad) => String(unidad.IdUnidadResponsable) === unidadSeleccionada
    )?.NombreUnidad;
    const programas = agruparProgramas(rowsVisibles);

    const exportarTodasLasUnidades = async () => {
        setExportError("");
        setExportando(true);
        try {
            await descargarReporteExcel(rows, data.ejercicio);
        } catch (err) {
            console.error("Error al generar el reporte de avance en Excel:", err);
            setExportError("No fue posible generar el archivo de Excel.");
        } finally {
            setExportando(false);
        }
    };

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
            {exportError && <Alert severity="error" sx={{ mb: 2 }}>{exportError}</Alert>}

            {!data && !error ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : data ? (
                <>
                    {data.puedeVerTodasUnidades && (
                        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mb: 3 }}>
                            <FormControl sx={{ minWidth: 280 }}>
                                <InputLabel id="unidad-avance-label">Unidad responsable</InputLabel>
                                <Select
                                    labelId="unidad-avance-label"
                                    value={unidadSeleccionada}
                                    label="Unidad responsable"
                                    onChange={(event) => setUnidadSeleccionada(event.target.value)}
                                >
                                    <MenuItem value="todas">Todas las unidades</MenuItem>
                                    {unidades.map((unidad) => (
                                        <MenuItem
                                            key={unidad.IdUnidadResponsable}
                                            value={String(unidad.IdUnidadResponsable)}
                                        >
                                            {unidad.NombreUnidad}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Button
                                variant="contained"
                                startIcon={exportando ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
                                onClick={exportarTodasLasUnidades}
                                disabled={exportando || rows.length === 0}
                            >
                                {exportando ? "Generando Excel..." : "Descargar avance de todas las unidades"}
                            </Button>
                        </Box>
                    )}
                    {rowsVisibles.length === 0 ? (
                        <Alert severity="info">
                            No hay acciones programadas
                            {data.puedeVerTodasUnidades
                                ? unidadSeleccionada === "todas"
                                    ? " para las unidades responsables"
                                    : ` para ${nombreUnidadSeleccionada ?? "la unidad seleccionada"}`
                                : " para esta unidad"}
                            {" "}en el ejercicio fiscal {data.ejercicio}.
                        </Alert>
                    ) : (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            {programas.map((programa) => (
                                <Paper key={programa.id} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
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
