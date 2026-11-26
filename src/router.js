const { servir } = require('./static');
const { json } = require('./utils/http');
const { usuarioDaRequisicao } = require('./utils/sessao');
const participantes = require('./routes/participantes');
const organizadores = require('./routes/organizadores');
const auth = require('./routes/auth');

// acesso: 'publico' | 'logado' | 'organizador' | 'participante'
// Handlers de rotas protegidas recebem (req, res, usuario).
const ROTAS = {
  'POST /api/participantes': { acesso: 'publico', fn: participantes.criar },
  'POST /api/organizadores': { acesso: 'publico', fn: organizadores.criar },
  'POST /api/login': { acesso: 'publico', fn: auth.login },
  'POST /api/logout': { acesso: 'publico', fn: auth.logout },
  'GET /api/me': { acesso: 'publico', fn: auth.eu },
};

async function tratar(req, res) {
  const caminho = req.url.split('?')[0];

  if (caminho.startsWith('/api/')) {
    const rota = ROTAS[`${req.method} ${caminho}`];
    if (!rota) return json(res, 404, { erro: 'Rota não encontrada' });

    // Defesa contra CSRF: escritas só aceitam JSON (formulários cross-site não conseguem enviar)
    if (req.method !== 'GET' && !String(req.headers['content-type'] || '').startsWith('application/json')) {
      return json(res, 415, { erro: 'Content-Type deve ser application/json.' });
    }

    try {
      let usuario = null;
      if (rota.acesso !== 'publico') {
        usuario = usuarioDaRequisicao(req);
        if (!usuario) return json(res, 401, { erro: 'Faça login para continuar.' });
        if (rota.acesso !== 'logado' && usuario.tipo !== rota.acesso) {
          return json(res, 403, { erro: 'Acesso negado para o seu perfil.' });
        }
      }
      return await rota.fn(req, res, usuario);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) json(res, 500, { erro: 'Erro interno.' });
      return;
    }
  }

  servir(req, res);
}

module.exports = { tratar };
