const db = require('./src/db');
const http = require('node:http');
const { tratar } = require('./src/router');
const { limparExpiradas } = require('./src/utils/sessao');

const PORT = Number(process.env.PORT) || 3000;

limparExpiradas();
setInterval(limparExpiradas, 60 * 60 * 1000).unref();

const servidor = http.createServer(tratar);
servidor.listen(PORT, '0.0.0.0', () => {
  console.log(`HackaToon rodando na porta ${PORT}`);
});

// Encerramento limpo (Railway envia SIGTERM a cada novo deploy)
function encerrar() {
  servidor.close(() => {
    try { db.close(); } catch { /* já fechado */ }
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', encerrar);
process.on('SIGINT', encerrar);
