require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const verificarToken = require('./middlewares/verificarToken');

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

const scannerRoutes = require('./routes/scanner.routes');
const usuarioRoutes = require('./routes/usuarios.routes');

// SQL
const config_prod = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true,
    }
};

async function getConnection() {
    const pool = await sql.connect(config_prod);
    return pool;
}

// ARCHIVOS
app.use('/archivos', express.static(path.join(__dirname, 'archivos')));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// RUTAS
app.use(scannerRoutes);
app.use(usuarioRoutes);

// LOGIN
app.post('/login', async (req, res) => {
    try {
        const { usuario, contraseña } = req.body;
        const pool = await getConnection();

        const result = await pool.request()
            .input('usuario', sql.VarChar, usuario)
            .query('SELECT * FROM Cat_Usuario WHERE NombreUsuario = @usuario');

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const user = result.recordset[0];

        // ⚠️ Si aún guardas contraseñas en texto plano, compara directo
        //const passwordMatch = contraseña === user.contraseña;
        // 👉 Mejor: si ya las migraste a hash, haz esto:
        const passwordMatch = await bcrypt.compare(contraseña, user.PASSWORDHASH);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const unidadesResult = await pool.request()
            .input('idUsuario', sql.Int, user.IDUSUARIO)
            .query(`
                SELECT DISTINCT ur.IdUnidadResponsable, ur.NombreUnidad
                FROM UnidadResponsableEmpleado ure
                JOIN UnidadResponsable ur
                    ON ur.IdUnidadResponsable = ure.IdUnidadResponsable
                WHERE ure.IdEmpleado = @idUsuario
                  AND ure.Activo = 1
                ORDER BY ur.NombreUnidad
            `);

        // 🔐 Crear token con expiración
        const token = jwt.sign(
            { idUsuario: user.IDUSUARIO, usuario: user.NOMBREUSUARIO },
            process.env.JWT_SECRET || "secreto_super_seguro",
            { expiresIn: '4h' } // expira en 4 horas
        );

        res.json({
            token,
            userId: user.IDUSUARIO,
            unidadesResponsables: unidadesResult.recordset,
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/avance-unidad', verificarToken, async (req, res) => {
    try {
        const idEjercicio = 1;
        const pool = await getConnection();
        const anioResult = await pool.request()
            .input('idEjercicio', sql.Int, idEjercicio)
            .query(`
                SELECT YEAR(FechaInicio) AS Anio
                FROM EjercicioFiscal
                WHERE IdEjercicio = @idEjercicio
            `);
        const unidadesResult = await pool.request()
            .input('idUsuario', sql.Int, req.user.idUsuario)
            .query(`
                SELECT DISTINCT ur.IdUnidadResponsable, ur.NombreUnidad
                FROM UnidadResponsableEmpleado ure
                JOIN UnidadResponsable ur
                    ON ur.IdUnidadResponsable = ure.IdUnidadResponsable
                WHERE ure.IdEmpleado = @idUsuario
                  AND ure.Activo = 1
                ORDER BY ur.NombreUnidad
            `);

        const result = await pool.request()
            .input('idUsuario', sql.Int, req.user.idUsuario)
            .input('idEjercicio', sql.Int, idEjercicio)
            .query(`
                WITH Avance AS (
                    SELECT IdAccion, IdTrimestre, SUM(CantidadRealizada) AS CantidadRealizada
                    FROM AvanceTrimestralAccion
                    GROUP BY IdAccion, IdTrimestre
                ),
                Base AS (
                    SELECT
                        p.NombrePrograma,
                        p.FinNarrativo,
                        p.PropositoNarrativo,
                        m.IdMeta,
                        m.NumeroMeta,
                        m.DescripcionMeta,
                        a.IdAccion,
                        a.NumeroAccion,
                        a.DescripcionAccion,
                        um.Nombre AS UnidadMedida,
                        ur.NombreUnidad AS UnidadEjecutora,
                        a.CantidadAnualProgramada,
                        t.MesFin,
                        pt.CantidadProgramada,
                        ISNULL(av.CantidadRealizada, 0) AS CantidadRealizada
                    FROM ProgramaPOA p
                    JOIN MetaPOA m
                        ON m.IdPrograma = p.IdPrograma
                    JOIN AccionPOA a
                        ON a.IdMeta = m.IdMeta
                    JOIN UnidadResponsable ur
                        ON ur.IdUnidadResponsable = a.IdUnidadResponsable
                    JOIN UnidadMedida um
                        ON um.IdUnidadMedida = a.IdUnidadMedida
                    JOIN ProgramacionTrimestralAccion pt
                        ON pt.IdAccion = a.IdAccion
                    JOIN Trimestre t
                        ON t.IdTrimestre = pt.IdTrimestre
                    LEFT JOIN Avance av
                        ON av.IdAccion = a.IdAccion
                       AND av.IdTrimestre = pt.IdTrimestre
                    WHERE p.IdEjercicio = @idEjercicio
                      AND EXISTS (
                          SELECT 1
                          FROM UnidadResponsableEmpleado ure
                          WHERE ure.IdEmpleado = @idUsuario
                            AND ure.IdUnidadResponsable = a.IdUnidadResponsable
                            AND ure.Activo = 1
                      )
                ),
                Renglones AS (
                    SELECT
                        NombrePrograma, FinNarrativo, PropositoNarrativo,
                        IdMeta, NumeroMeta, DescripcionMeta, IdAccion, NumeroAccion,
                        DescripcionAccion, UnidadMedida, UnidadEjecutora,
                        CantidadAnualProgramada, 1 AS Orden, 'PROGRAMADO' AS Concepto,
                        MesFin, CantidadProgramada AS Cantidad
                    FROM Base
                    UNION ALL
                    SELECT
                        NombrePrograma, FinNarrativo, PropositoNarrativo,
                        IdMeta, NumeroMeta, DescripcionMeta, IdAccion, NumeroAccion,
                        DescripcionAccion, UnidadMedida, UnidadEjecutora,
                        CantidadAnualProgramada, 2, 'REALIZADO',
                        MesFin, CantidadRealizada
                    FROM Base
                )
                SELECT
                    IdAccion,
                    NombrePrograma,
                    FinNarrativo,
                    PropositoNarrativo,
                    IdMeta,
                    NumeroMeta,
                    DescripcionMeta,
                    NumeroAccion,
                    DescripcionAccion,
                    UnidadMedida,
                    UnidadEjecutora,
                    Concepto,
                    CantidadAnualProgramada AS Anual,
                    SUM(CASE WHEN MesFin = 1 THEN Cantidad END) AS ENE,
                    SUM(CASE WHEN MesFin = 2 THEN Cantidad END) AS FEB,
                    SUM(CASE WHEN MesFin = 3 THEN Cantidad END) AS MAR,
                    SUM(CASE WHEN MesFin = 4 THEN Cantidad END) AS ABR,
                    SUM(CASE WHEN MesFin = 5 THEN Cantidad END) AS MAY,
                    SUM(CASE WHEN MesFin = 6 THEN Cantidad END) AS JUN,
                    SUM(CASE WHEN MesFin = 7 THEN Cantidad END) AS JUL,
                    SUM(CASE WHEN MesFin = 8 THEN Cantidad END) AS AGO,
                    SUM(CASE WHEN MesFin = 9 THEN Cantidad END) AS SEP,
                    SUM(CASE WHEN MesFin = 10 THEN Cantidad END) AS OCT,
                    SUM(CASE WHEN MesFin = 11 THEN Cantidad END) AS NOV,
                    SUM(CASE WHEN MesFin = 12 THEN Cantidad END) AS DIC,
                    SUM(Cantidad) AS TOTAL
                FROM Renglones
                GROUP BY
                    NombrePrograma, FinNarrativo, PropositoNarrativo,
                    IdMeta, NumeroMeta, DescripcionMeta, IdAccion, NumeroAccion,
                    DescripcionAccion, UnidadMedida, UnidadEjecutora,
                    CantidadAnualProgramada, Orden, Concepto
                ORDER BY NombrePrograma, NumeroMeta, NumeroAccion, Orden
            `);

        res.json({
            ejercicio: anioResult.recordset[0]?.Anio ?? idEjercicio,
            unidades: unidadesResult.recordset,
            rows: result.recordset,
        });
    } catch (err) {
        console.error('Error al consultar el avance de la unidad responsable:', err);
        res.status(500).json({ error: 'No fue posible consultar el avance de la unidad responsable' });
    }
});

const port = process.env.PORT || 3003;
const host = process.env.HOST || '0.0.0.0'; // 0.0.0.0 escucha en todas las interfaces

app.listen(port, host, () => {
    console.log(`API corriendo en http://${host}:${port}`);
});