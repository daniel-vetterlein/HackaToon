const crypto = require('node:crypto');
const db = require('../db');

const NOME_COOKIE = 'hk_sid';
const DURACAO_S = 7 * 24 * 60 * 60; // 7 dias

const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

function lerCookie(req, nome) {
  for (const parte of String(req.headers.cookie || '').split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === nome) return parte.slice(i + 1).trim();
  }
  return null;
}

function seguro(req) {
  return req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
}

function montarCookie(req, valor, maxAge) {
  return `${NOME_COOKIE}=${valor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${seguro(req) ? '; Secure' : ''}`;
}

function criarSessao(req, res, usuarioId) {
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)')
    .run(hashToken(token), usuarioId, Date.now() + DURACAO_S * 1000);
  res.setHeader('Set-Cookie', montarCookie(req, token, DURACAO_S));
}

// Retorna { id, tipo, nome, email, instituicao } ou null
function usuarioDaRequisicao(req) {
  const token = lerCookie(req, NOME_COOKIE);
  if (!token) return null;
  const linha = db.prepare(`
    SELECT u.id, u.tipo, u.nome, u.email, u.instituicao, s.expira_em
    FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
    WHERE s.token_hash = ?`).get(hashToken(token));
  if (!linha) return null;
  if (linha.expira_em < Date.now()) {
    db.prepare('DELETE FROM sessoes WHERE token_hash = ?').run(hashToken(token));
    return null;
  }
  const { expira_em, ...usuario } = linha;
  return usuario;
}

function encerrarSessao(req, res) {
  const token = lerCookie(req, NOME_COOKIE);
  if (token) db.prepare('DELETE FROM sessoes WHERE token_hash = ?').run(hashToken(token));
  res.setHeader('Set-Cookie', montarCookie(req, '', 0));
}

function limparExpiradas() {
  db.prepare('DELETE FROM sessoes WHERE expira_em < ?').run(Date.now());
}

module.exports = { criarSessao, usuarioDaRequisicao, encerrarSessao, limparExpiradas };
