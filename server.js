require('./src/db');
const http = require('node:http');
const { tratar } = require('./src/router');
const { limparExpiradas } = require('./src/utils/sessao');

const PORT = Number(process.env.PORT) || 3000;

limparExpiradas();
setInterval(limparExpiradas, 60 * 60 * 1000).unref();

http.createServer(tratar).listen(PORT, '0.0.0.0', () => {
  console.log(`HackaToon rodando na porta ${PORT}`);
});
