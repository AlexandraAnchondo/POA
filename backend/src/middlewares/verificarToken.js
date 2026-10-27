const jwt = require('jsonwebtoken');
require('dotenv').config(); 

function verificarToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(403).json({ error: 'Token requerido' });
    }

    // Espera: "Bearer TOKEN"
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "secreto_super_seguro"
        );

        req.user = decoded;
        next();
    } catch (err) {
        console.error('Error JWT:', err.message);
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

module.exports = verificarToken;
