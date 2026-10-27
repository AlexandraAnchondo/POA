const express = require('express');
const router = express.Router();
const scannerController = require("../controllers/scanner.controller");

router.post("/scanner/start", scannerController.startScannerService);
router.post("/scanner/stop", scannerController.stopScannerService);

module.exports = router;