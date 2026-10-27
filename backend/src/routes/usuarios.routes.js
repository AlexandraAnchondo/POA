const express = require('express');
const router = express.Router();

const controller = require('../controllers/usuarios.controller');
const verifyToken = require('../middlewares/verificarToken');

router.post('/cambiar_password', verifyToken, controller.actualizarPassword);

module.exports = router;