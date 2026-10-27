require('dotenv').config();
const sql = require('mssql');
const bcrypt = require('bcryptjs');

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

exports.actualizarPassword = async (req, res) => {
    try {
        const { userId, nueva } = req.body;

        const pool = await getConnection();

        const hashedPassword = await bcrypt.hash(nueva, 10);
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('nueva', sql.VarChar(255), hashedPassword)
            .query('UPDATE Cat_Usuario SET PasswordHash = @nueva WHERE IdUsuario = @userId');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json({ message: "Contraseña actualizada correctamente" });
    } catch (error) {
        console.error("Error al actualizar la contraseña:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};