require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

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
        const passwordMatch = await bcrypt.compare(contraseña, user.PasswordHash);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        // 🔐 Crear token con expiración
        const token = jwt.sign(
            { id: user.id, usuario: user.usuario },
            process.env.JWT_SECRET || "secreto_super_seguro",
            { expiresIn: '4h' } // expira en 4 horas
        );

        res.json({ token, userId: user.IdUsuario });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

const port = process.env.PORT || 3003;
const host = process.env.HOST || '0.0.0.0'; // 0.0.0.0 escucha en todas las interfaces

app.listen(port, host, () => {
    console.log(`API corriendo en http://${host}:${port}`);
});