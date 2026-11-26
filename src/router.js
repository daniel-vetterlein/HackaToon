const { servir } = require('./static');
const { json } = require('./utils/http');
const { usuarioDaRequisicao } = require('./utils/sessao');
const participantes = require('./routes/participantes');
const organizadores = require('./routes/organizadores');
const auth = require('./routes/auth');
const eventos = require('./routes/eventos');
const equipes = require('./routes/equipes');

// acesso: 'publico' | 'logado' | 'organizador' | 'participante'
// Handlers de rotas protegidas recebem (req, res, usuario).
const ROTAS = {
  'POST /api/participantes': { acesso: 'publico', fn: participantes.criar },
  'POST /api/organizadores': { acesso: 'publico', fn: organizadores.criar },
  'POST /api/login': { acesso: 'publico', fn: auth.login },
  'POST /api/logout': { acesso: 'publico', fn: auth.logout },
  'GET /api/me': { acesso: 'publico', fn: auth.eu },
  ...eventos.rotas,
  ...equipes.rotas,
};

// Rotas com parâmetros (ex.: /api/x/:id) viram regex; os valores vão em req.params
const PADROES = Object.entries(ROTAS)
  .filter(([chave]) => chave.includes(':'))
  .map(([chave, rota]) => {
    const [metodo, caminho] = chave.split(' ');
    const nomes = [];
    const re = new RegExp('^' + caminho.replace(/:(\w+)/g, (_, n) => { nomes.push(n); return '(\\d+)'; }) + '$');
    return { metodo, re, nomes, rota };
  });

function achar(metodo, caminho) {
  const exata = ROTAS[`${metodo} ${caminho}`];
  if (exata) return { rota: exata, params: {} };
  for (const p of PADROES) {
    if (p.metodo !== metodo) continue;
    const m = p.re.exec(caminho);
    if (m) return { rota: p.rota, params: Object.fromEntries(p.nomes.map((n, i) => [n, Number(m[i + 1])])) };
  }
  return null;
}

async function tratar(req, res) {
  const caminho = req.url.split('?')[0];

  if (caminho.startsWith('/api/')) {
    const achada = achar(req.method, caminho);
    if (!achada) return json(res, 404, { erro: 'Rota não encontrada' });
    const { rota } = achada;
    req.params = achada.params;

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
