const { spawn } = require("child_process");
const path = require("path");
const net = require("net");

function isPortOpen(port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();

        socket.setTimeout(1000);

        socket.once("connect", () => {
            socket.destroy();
            resolve(true);
        });

        socket.once("timeout", () => {
            socket.destroy();
            resolve(false);
        });

        socket.once("error", () => {
            resolve(false);
        });

        socket.connect(port, "127.0.0.1");
    });
}

let scannerProcess = null;

exports.startScannerService = async (req, res) => {
    try {

        const portRunning = await isPortOpen(5000);

        if (portRunning) {
            return res.json({ message: "Scanner ya está activo" });
        }

        const exePath = path.join(
            process.cwd(),
            "../scanner",
            "scanner-service.exe"
        );

        scannerProcess = spawn(exePath, [], {
            cwd: path.dirname(exePath),
            windowsHide: true
        });

        scannerProcess.on("error", (err) => {
            console.error("Error iniciando scanner:", err);
        });

        // Esperar hasta que el puerto esté listo
        let attempts = 0;

        const waitForPort = setInterval(async () => {
            const running = await isPortOpen(5000);

            if (running) {
                clearInterval(waitForPort);
                return res.json({ message: "Scanner iniciado correctamente" });
            }

            attempts++;

            if (attempts > 20) {
                clearInterval(waitForPort);
                return res.status(500).json({
                    message: "No se pudo iniciar el scanner"
                });
            }

        }, 500);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error iniciando scanner" });
    }
};

exports.stopScannerService = (req, res) => {
    if (scannerProcess) {
        scannerProcess.kill();
        scannerProcess = null;
        return res.json({ message: "Scanner detenido" });
    }

    res.json({ message: "Scanner no estaba activo" });
};