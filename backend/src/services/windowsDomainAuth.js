const { spawn } = require('child_process');
const path = require('path');

const dominioWindows = process.env.WINDOWS_AUTH_DOMAIN || 'CBC';
const powershellPath = process.env.POWERSHELL_PATH || 'powershell.exe';
const scriptPath = path.resolve(__dirname, '../../scripts/validateDomainCredentials.ps1');
const timeoutMs = 10000;
const maxOutputBytes = 1024 * 1024;

function autenticarEnDominio(usuario, contraseña) {
    if (process.platform !== 'win32') {
        return Promise.reject(new Error('La autenticación nativa del dominio requiere Windows.'));
    }

    return new Promise((resolve, reject) => {
        const proceso = spawn(
            powershellPath,
            ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', scriptPath],
            { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }
        );
        let salida = '';
        let errorSalida = '';
        let salidaExcesiva = false;
        let finalizado = false;

        const temporizador = setTimeout(() => {
            proceso.kill();
            finalizar(new Error('La validación de credenciales de dominio excedió el tiempo límite.'));
        }, timeoutMs);

        const finalizar = (error, resultado) => {
            if (finalizado) return;
            finalizado = true;
            clearTimeout(temporizador);
            if (error) reject(error);
            else resolve(resultado);
        };

        proceso.stdout.setEncoding('utf8');
        proceso.stderr.setEncoding('utf8');
        proceso.stdout.on('data', (fragmento) => {
            salida += fragmento;
            if (Buffer.byteLength(salida, 'utf8') > maxOutputBytes) {
                salidaExcesiva = true;
                proceso.kill();
                finalizar(new Error('La respuesta del proceso de autenticación excedió el límite permitido.'));
            }
        });
        proceso.stderr.on('data', (fragmento) => {
            errorSalida += fragmento;
            if (Buffer.byteLength(errorSalida, 'utf8') > maxOutputBytes) {
                proceso.kill();
                finalizar(new Error('La salida de error del proceso de autenticación excedió el límite permitido.'));
            }
        });
        proceso.on('error', () => {
            finalizar(new Error('No fue posible iniciar el proceso de autenticación de Windows.'));
        });
        proceso.on('close', (codigo) => {
            if (salidaExcesiva || finalizado) return;
            if (codigo !== 0) {
                finalizar(new Error('El proceso de autenticación de Windows terminó con error.'));
                return;
            }

            try {
                const resultado = JSON.parse(salida.trim());
                if (typeof resultado.authenticated !== 'boolean'
                    || !Number.isInteger(resultado.errorCode)) {
                    throw new Error('Respuesta inválida del proceso de autenticación.');
                }
                finalizar(null, resultado);
            } catch {
                finalizar(new Error('No fue posible interpretar la respuesta de autenticación de Windows.'));
            }
        });

        proceso.stdin.on('error', () => {
            finalizar(new Error('No fue posible enviar las credenciales al proceso de autenticación.'));
        });
        proceso.stdin.end(JSON.stringify({ usuario, password: contraseña, dominio: dominioWindows }));
    });
}

module.exports = { autenticarEnDominio };
