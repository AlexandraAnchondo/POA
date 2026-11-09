require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const verificarToken = require('./middlewares/verificarToken');
const { autenticarEnDominio } = require('./services/windowsDomainAuth');

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

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

// RUTAS
app.use(usuarioRoutes);

// LOGIN
app.post('/login', async (req, res) => {
    try {
        const usuarioIngresado = typeof req.body.usuario === 'string'
            ? req.body.usuario.trim()
            : '';
        const contraseña = typeof req.body.contraseña === 'string'
            ? req.body.contraseña
            : '';

        if (!usuarioIngresado || usuarioIngresado.length > 50
            || /[@\\/\u0000-\u001f\u007f]/.test(usuarioIngresado) || !contraseña) {
            return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
        }

        let resultadoAutenticacion;
        try {
            resultadoAutenticacion = await autenticarEnDominio(usuarioIngresado, contraseña);
        } catch (err) {
            console.error('Error al validar las credenciales con Windows:', err.message);
            return res.status(503).json({
                error: 'No fue posible validar las credenciales con el dominio desde este servidor.',
            });
        }

        if (!resultadoAutenticacion.authenticated) {
            if (resultadoAutenticacion.errorCode === 1326) {
                return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
            }
            if ([1311, 1355, 1722, 1726, 1727, 53, 64, 1219, 1225, 1460]
                .includes(resultadoAutenticacion.errorCode)) {
                console.error(
                    'El dominio no está disponible para validar credenciales. Código de Windows:',
                    resultadoAutenticacion.errorCode
                );
                return res.status(503).json({
                    error: 'No fue posible contactar al dominio para validar las credenciales.',
                });
            }

            return res.status(403).json({
                error: 'El dominio rechazó el inicio de sesión o la cuenta tiene restricciones.',
            });
        }

        const nombreUsuario = usuarioIngresado.toLowerCase();
        const pool = await getConnection();
        const cuentaExistente = await pool.request()
            .input('usuario', sql.VarChar(50), nombreUsuario)
            .query('SELECT TOP (1) IDUSUARIO FROM dbo.CAT_USUARIO WHERE NOMBREUSUARIO = @usuario');
        let datosAlta = null;

        let accesoResult;
        try {
            accesoResult = await pool.request()
                .input('usuario', sql.VarChar(50), nombreUsuario)
                .query(`
                    SELECT DISTINCT TOP (2) Empleado, Permiso
                    FROM [SIC_2026].[dbo].[Acceso]
                    WHERE Usuario = @usuario
                        AND Sistema = 31
                        AND Empleado IS NOT NULL
                `);
        } catch (err) {
            console.error('Error al verificar el acceso del usuario en SIC_2026:', err.message);
            return res.status(503).json({
                error: 'No fue posible verificar el acceso al sistema. Contacte al administrador.',
            });
        }

        if (accesoResult.recordset.length === 0) {
            return res.status(403).json({
                error: 'Tu usuario no tiene acceso autorizado al sistema POA.',
            });
        }

        if (accesoResult.recordset.length !== 1) {
            console.error('El usuario tiene más de un número de empleado asociado en SIC_2026.');
            return res.status(409).json({
                error: 'No fue posible identificar de forma única tu registro de empleado. Contacte al administrador.',
            });
        }

        const idEmpleadoSic = Number(accesoResult.recordset[0].Empleado);
        if (!Number.isSafeInteger(idEmpleadoSic) || idEmpleadoSic <= 0) {
            console.error('SIC_2026 devolvió un número de empleado inválido.');
            return res.status(409).json({
                error: 'No fue posible identificar tu registro de empleado. Contacte al administrador.',
            });
        }

        if (cuentaExistente.recordset.length === 0) {
            let empleadoResult;
            try {
                empleadoResult = await pool.request()
                    .input('empleado', sql.Int, idEmpleadoSic)
                    .query(`
                        SELECT DISTINCT TOP (2)
                            e.Empleado,
                            b.Nombre,
                            b.ApellidoPaterno,
                            b.ApellidoMaterno,
                            e.IdDepartamentoA
                        FROM [SIC_2026].[dbo].[View_G_Cat_Beneficiarios] b
                        INNER JOIN [SIC_2026].[dbo].[View_N_EmpleadosNominaCero] n
                            ON b.IdBeneficiario = n.IdEmpleado
                        INNER JOIN [SIC_2026].[dbo].[View_GESTA_Empleado] e
                            ON n.Empleado = e.Empleado
                        WHERE e.Empleado = @empleado
                    `);
            } catch (err) {
                console.error('Error al consultar el empleado en SIC_2026:', err.message);
                return res.status(503).json({
                    error: 'No fue posible consultar los datos del empleado. Contacte al administrador.',
                });
            }

            if (empleadoResult.recordset.length !== 1) {
                console.error('El empleado no existe o tiene datos ambiguos en las vistas de SIC_2026.');
                return res.status(409).json({
                    error: 'No fue posible obtener un registro único del empleado. Contacte al administrador.',
                });
            }

            const empleado = empleadoResult.recordset[0];
            const claveUnidad = String(empleado.IdDepartamentoA ?? '').trim();
            const nombre = String(empleado.Nombre ?? '').trim();
            const apellidoPaterno = String(empleado.ApellidoPaterno ?? '').trim();
            const apellidoMaterno = String(empleado.ApellidoMaterno ?? '').trim();
            if (!nombre || !apellidoPaterno || !claveUnidad || claveUnidad.length > 30) {
                console.error('El empleado no tiene nombre, apellido paterno o departamento asignado en SIC_2026.');
                return res.status(409).json({
                    error: 'El registro del empleado está incompleto. Contacte al administrador.',
                });
            }

            let unidadResult;
            try {
                unidadResult = await pool.request()
                    .input('claveUnidad', sql.VarChar(30), claveUnidad)
                    .query(`
                        SELECT TOP (2) IdUnidadResponsable
                        FROM dbo.UnidadResponsable
                        WHERE ClaveUnidad = @claveUnidad
                          AND Activo = 1
                    `);
            } catch (err) {
                console.error('Error al consultar la unidad responsable en POA_CBC:', err.message);
                return res.status(503).json({
                    error: 'No fue posible consultar la unidad responsable. Contacte al administrador.',
                });
            }

            if (unidadResult.recordset.length !== 1) {
                console.error('La clave de departamento no coincide con una única unidad responsable activa.');
                return res.status(409).json({
                    error: 'No fue posible identificar una unidad responsable activa para tu empleado. Contacte al administrador.',
                });
            }

            datosAlta = {
                empleado: {
                    nombre: nombre.slice(0, 100),
                    apellidoPaterno: apellidoPaterno.slice(0, 100),
                    apellidoMaterno: apellidoMaterno.slice(0, 100) || null,
                },
                idUnidadResponsable: unidadResult.recordset[0].IdUnidadResponsable,
                passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
            };
        }

        const transaction = new sql.Transaction(pool);
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

        let user;
        try {
            const userResult = await new sql.Request(transaction)
                .input('usuario', sql.VarChar(50), nombreUsuario)
                .input('passwordHash', sql.VarChar(255), datosAlta?.passwordHash ?? null)
                .input('nombre', sql.VarChar(100), datosAlta?.empleado.nombre ?? null)
                .input('apellidoPaterno', sql.VarChar(100), datosAlta?.empleado.apellidoPaterno ?? null)
                .input('apellidoMaterno', sql.VarChar(100), datosAlta?.empleado.apellidoMaterno ?? null)
                .input('correo', sql.VarChar(150), null)
                .input('idUnidadResponsable', sql.Int, datosAlta?.idUnidadResponsable ?? null)
                .query(`
                    DECLARE @idUsuario int;
                    SELECT @idUsuario = IDUSUARIO
                    FROM dbo.CAT_USUARIO WITH (UPDLOCK, HOLDLOCK)
                    WHERE NOMBREUSUARIO = @usuario;

                    IF @idUsuario IS NULL
                    BEGIN
                        DECLARE @idPerfil int = (
                            SELECT TOP (1) IDPERFIL
                            FROM dbo.CAT_PERFIL_USUARIO
                            WHERE CLAVEPERFIL = 'CONSULTA'
                              AND IDESTATUS = (
                                  SELECT TOP (1) IDESTATUS
                                  FROM dbo.CAT_ESTATUS
                                  WHERE CLAVEESTATUS = 'ACTIVO' AND ACTIVO = 1
                              )
                        );
                        DECLARE @idEstatus int = (
                            SELECT TOP (1) IDESTATUS
                            FROM dbo.CAT_ESTATUS
                            WHERE CLAVEESTATUS = 'ACTIVO' AND ACTIVO = 1
                        );

                        IF @idPerfil IS NULL OR @idEstatus IS NULL
                            THROW 50001, 'No existe el perfil CONSULTA o estatus ACTIVO requerido para crear la cuenta.', 1;

                        INSERT INTO dbo.CAT_USUARIO (
                            NOMBREUSUARIO, PASSWORDHASH, NOMBRE, APELLIDOPATERNO,
                            APELLIDOMATERNO, CORREOELECTRONICO, IDPERFIL, IDESTATUS,
                            INTENTOSLOGIN, BLOQUEADO, FECHACREACION, USUARIOCREACION
                        )
                        VALUES (
                            @usuario, @passwordHash, @nombre, @apellidoPaterno,
                            @apellidoMaterno, @correo, @idPerfil, @idEstatus,
                            0, 0, GETDATE(), @usuario
                        );

                        SET @idUsuario = SCOPE_IDENTITY();

                        INSERT INTO dbo.UnidadResponsableEmpleado (
                            IdUnidadResponsable,
                            IdEmpleado,
                            RolEnUnidad,
                            Activo,
                            FechaInicioVigencia,
                            FechaFinVigencia
                        )
                        VALUES (
                            @idUnidadResponsable,
                            @idUsuario,
                            'ENLACE',
                            1,
                            CAST(GETDATE() AS date),
                            NULL
                        );
                    END;

                    UPDATE u
                    SET ULTIMOACCESO = GETDATE()
                    FROM dbo.CAT_USUARIO u
                    JOIN dbo.CAT_ESTATUS e ON e.IDESTATUS = u.IDESTATUS
                    WHERE u.IDUSUARIO = @idUsuario
                      AND u.BLOQUEADO = 0
                      AND e.CLAVEESTATUS = 'ACTIVO'
                      AND e.ACTIVO = 1;

                    SELECT
                        u.IDUSUARIO,
                        u.NOMBREUSUARIO,
                        u.BLOQUEADO,
                        e.CLAVEESTATUS,
                        e.ACTIVO AS ESTATUSACTIVO
                    FROM dbo.CAT_USUARIO u
                    JOIN dbo.CAT_ESTATUS e ON e.IDESTATUS = u.IDESTATUS
                    WHERE u.IDUSUARIO = @idUsuario;
                `);
            user = userResult.recordset[0];
            await transaction.commit();
        } catch (err) {
            await transaction.rollback().catch((rollbackError) => {
                console.error('Error al revertir la transacción de inicio de sesión:', rollbackError.message);
            });
            throw err;
        }

        if (!user || user.BLOQUEADO || user.CLAVEESTATUS !== 'ACTIVO' || !user.ESTATUSACTIVO) {
            return res.status(403).json({
                error: 'La cuenta de POA está inactiva o bloqueada. Contacte al administrador.',
            });
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

        const permiso = String(accesoResult.recordset[0].Permiso ?? '').trim();

        // 🔐 Crear token con expiración
        const token = jwt.sign(
            { idUsuario: user.IDUSUARIO, usuario: user.NOMBREUSUARIO, permiso: permiso },
            process.env.JWT_SECRET || "secreto_super_seguro",
            { expiresIn: '4h' } // expira en 4 horas
        );

        res.json({
            token,
            userId: user.IDUSUARIO,
            usuario: user.NOMBREUSUARIO,
            unidadesResponsables: unidadesResult.recordset,
        });
    } catch (err) {
        console.error('Error al iniciar sesión:', err.message);
        res.status(500).json({ error: 'No fue posible iniciar sesión' });
    }
});

app.get('/avance-unidad', verificarToken, async (req, res) => {
    try {
        const idEjercicio = 1;
        const pool = await getConnection();
        const accesoGlobalResult = await pool.request()
            .input('idUsuario', sql.Int, req.user.idUsuario)
            .input('Permiso', sql.Int, req.user.permiso)
            .query(`
                SELECT CASE 
                    WHEN @Permiso = 2 OR EXISTS (
                        SELECT 1
                        FROM UnidadResponsableEmpleado
                        WHERE IdEmpleado = @idUsuario
                        AND IdUnidadResponsable = 1
                        AND Activo = 1
                    )
                    THEN 1 
                    ELSE 0 
                END AS PuedeVerTodas
            `);
        const puedeVerTodasUnidades = accesoGlobalResult.recordset[0]?.PuedeVerTodas === 1;

        const anioResult = await pool.request()
            .input('idEjercicio', sql.Int, idEjercicio)
            .query(`
                SELECT YEAR(FechaInicio) AS Anio
                FROM EjercicioFiscal
                WHERE IdEjercicio = @idEjercicio
            `);
        const unidadesRequest = pool.request()
            .input('idUsuario', sql.Int, req.user.idUsuario);
        const unidadesResult = puedeVerTodasUnidades
            ? await unidadesRequest.query(`
                SELECT IdUnidadResponsable, NombreUnidad
                FROM UnidadResponsable
                ORDER BY NombreUnidad
            `)
            : await unidadesRequest.query(`
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
            .input('puedeVerTodas', sql.Bit, puedeVerTodasUnidades)
            .input('idEjercicio', sql.Int, idEjercicio)
            .query(`
                WITH Avance AS (
                    SELECT IdAccion, IdTrimestre, SUM(CantidadRealizada) AS CantidadRealizada
                    FROM AvanceTrimestralAccion
                    GROUP BY IdAccion, IdTrimestre
                ),
                Base AS (
                    SELECT
                        p.IdPrograma,
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
                        ur.IdUnidadResponsable,
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
                      AND (
                          @puedeVerTodas = 1
                          OR EXISTS (
                              SELECT 1
                              FROM UnidadResponsableEmpleado ure
                              WHERE ure.IdEmpleado = @idUsuario
                                AND ure.IdUnidadResponsable = a.IdUnidadResponsable
                                AND ure.Activo = 1
                          )
                      )
                ),
                Renglones AS (
                    SELECT
                        IdPrograma, NombrePrograma, FinNarrativo, PropositoNarrativo,
                        IdMeta, NumeroMeta, DescripcionMeta, IdAccion, NumeroAccion,
                        DescripcionAccion, UnidadMedida, IdUnidadResponsable, UnidadEjecutora,
                        CantidadAnualProgramada, 1 AS Orden, 'PROGRAMADO' AS Concepto,
                        MesFin, CantidadProgramada AS Cantidad
                    FROM Base
                    UNION ALL
                    SELECT
                        IdPrograma, NombrePrograma, FinNarrativo, PropositoNarrativo,
                        IdMeta, NumeroMeta, DescripcionMeta, IdAccion, NumeroAccion,
                        DescripcionAccion, UnidadMedida, IdUnidadResponsable, UnidadEjecutora,
                        CantidadAnualProgramada, 2, 'REALIZADO',
                        MesFin, CantidadRealizada
                    FROM Base
                )
                SELECT
                    IdAccion,
                    IdPrograma,
                    NombrePrograma,
                    FinNarrativo,
                    PropositoNarrativo,
                    IdMeta,
                    NumeroMeta,
                    DescripcionMeta,
                    NumeroAccion,
                    DescripcionAccion,
                    UnidadMedida,
                    IdUnidadResponsable,
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
                    IdPrograma, NombrePrograma, FinNarrativo, PropositoNarrativo,
                    IdMeta, NumeroMeta, DescripcionMeta, IdAccion, NumeroAccion,
                    DescripcionAccion, UnidadMedida, IdUnidadResponsable, UnidadEjecutora,
                    CantidadAnualProgramada, Orden, Concepto
                ORDER BY IdPrograma, NumeroMeta, NumeroAccion, Orden
            `);

        res.json({
            ejercicio: anioResult.recordset[0]?.Anio ?? idEjercicio,
            unidades: unidadesResult.recordset,
            puedeVerTodasUnidades,
            rows: result.recordset,
        });
    } catch (err) {
        console.error('Error al consultar el avance de la unidad responsable:', err);
        res.status(500).json({ error: 'No fue posible consultar el avance de la unidad responsable' });
    }
});

const port = process.env.PORT || 3006;
const host = process.env.HOST || '0.0.0.0'; // 0.0.0.0 escucha en todas las interfaces

app.listen(port, host, () => {
    console.log(`API corriendo en http://${host}:${port}`);
});