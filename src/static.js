const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream');
const { usuarioDaRequisicao } = require('./utils/sessao');

const PUBLIC = path.resolve(__dirname, '..', 'public');
const PAGES_DIR = path.resolve(PUBLIC, 'pages');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// acesso: 'publico' | 'visitante' (só deslogado) | 'logado' | 'organizador' | 'participante'
const PAGINAS = {
  '/': { arquivo: 'index.html', acesso: 'publico' },
  '/login': { arquivo: 'login.html', acesso: 'visitante' },
  '/cadastrar-organizador': { arquivo: 'cadastrar-organizador.html', acesso: 'visitante' },
  '/cadastrar-participante': { arquivo: 'cadastrar-participante.html', acesso: 'visitante' },
  '/painel': { arquivo: 'painel.html', acesso: 'logado' },
  '/participante': { arquivo: 'participante.html', acesso: 'participante' },
  '/participante/equipe': { arquivo: 'participante-equipe.html', acesso: 'participante' },
  '/organizador': { arquivo: 'organizador.html', acesso: 'organizador' },
  '/organizador/evento': { arquivo: 'organizador-evento.html', acesso: 'organizador' },
};

function redirecionar(res, destino) {
  res.writeHead(302, { Location: destino, 'Cache-Control': 'no-store' });
  res.end();
}

function erro(res, codigo, mensagem, extras = {}) {
  res.writeHead(codigo, {
    'Content-Type': 'text/plain; charset=utf-8',
    ...extras,
  });
  res.end(mensagem);
}

function servir(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return erro(res, 405, 'Método não permitido', { Allow: 'GET, HEAD' });
  }

  let urlLimpa;
  try {
    urlLimpa = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    return erro(res, 400, 'Requisição inválida');
  }

  if (urlLimpa.includes('\0')) {
    return erro(res, 400, 'Requisição inválida');
  }

  if (urlLimpa.split('/').some((parte) => parte.startsWith('.'))) {
    return erro(res, 403, 'Proibido');
  }

  // Normaliza barra final, exceto na raiz '/'
  if (urlLimpa.length > 1 && urlLimpa.endsWith('/')) {
    urlLimpa = urlLimpa.slice(0, -1);
  }

  let caminho;

  if (Object.hasOwn(PAGINAS, urlLimpa)) {
    const { arquivo, acesso } = PAGINAS[urlLimpa];
    if (acesso !== 'publico') {
      const usuario = usuarioDaRequisicao(req);
      if (acesso === 'visitante' && usuario) return redirecionar(res, '/painel');
      if (acesso !== 'visitante' && !usuario) {
        return redirecionar(res, `/login?next=${encodeURIComponent(urlLimpa)}`);
      }
      if (usuario && (acesso === 'organizador' || acesso === 'participante') && usuario.tipo !== acesso) {
        return redirecionar(res, '/painel');
      }
    }
    caminho = path.resolve(PAGES_DIR, arquivo);
  } else {
    caminho = path.resolve(PUBLIC, urlLimpa.slice(1));

    // Bloqueia acesso direto a qualquer arquivo dentro de public/pages/ mesmo com // ou /./
    if (caminho.startsWith(PAGES_DIR + path.sep) || caminho === PAGES_DIR) {
      return erro(res, 403, 'Proibido');
    }
  }

  // Garante que o destino final esteja estritamente dentro de public/
  if (!caminho.startsWith(PUBLIC + path.sep)) {
    return erro(res, 403, 'Proibido');
  }

  fs.stat(caminho, (err, stats) => {
    if (err || !stats.isFile()) {
      return erro(res, 404, 'Não encontrado');
    }

    const ext = path.extname(caminho).toLowerCase();
    const tipo = TIPOS[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': tipo,
      'Content-Length': stats.size,
      'X-Content-Type-Options': 'nosniff',
      ...(caminho.startsWith(PAGES_DIR) ? { 'Cache-Control': 'no-store' } : {}),
    });

    if (req.method === 'HEAD') {
      return res.end();
    }

    pipeline(fs.createReadStream(caminho), res, () => {});
  });
}

module.exports = { servir };