const { servir } = require('./static');
const { json } = require('./utils/http');
const participantes = require('./routes/participantes');

const ROTAS = {
  'POST /api/participantes': participantes.criar,
};

async function tratar(req, res) {
  const caminho = req.url.split('?')[0];

  if (caminho.startsWith('/api/')) {
    const rota = ROTAS[`${req.method} ${caminho}`];
    if (!rota) return json(res, 404, { erro: 'Rota não encontrada' });

    try {
      return await rota(req, res);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) json(res, 500, { erro: 'Erro interno.' });
      return;
    }
  }

  servir(req, res);
}

module.exports = { tratar };