const { servir } = require('./static');

function tratar(req, res) {
  if (req.url.startsWith('/api/')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ erro: 'Rota não encontrada' }));
  }
  servir(req, res);
}

module.exports = { tratar };