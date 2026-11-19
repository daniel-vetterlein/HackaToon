const crypto = require('node:crypto');
const db = require('../db');
const { lerJson, json } = require('../utils/http');
const { gerarHash } = require('../utils/senha');
const envio = require('../services/envio');

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALIDADE_MS = 10 * 60 * 1000;   // o código vale 10 minutos
const MAX_TENTATIVAS = 5;

function validar(corpo) {
  const nome = String(corpo.nome ?? '').trim();
  const email = String(corpo.email ?? '').trim();
  const telefone = String(corpo.telefone ?? '').replace(/\D/g, '');
  const senha = String(corpo.senha ?? '');
  const instituicao = String(corpo.instituicao ?? '').trim();

  if (nome.length < 2 || nome.length > 120) return { erro: 'Informe seu nome completo.' };
  if (!REGEX_EMAIL.test(email) || email.length > 160) return { erro: 'Informe um e-mail válido.' };
  if (telefone.length < 10 || telefone.length > 13) return { erro: 'Informe o telefone com DDD.' };
  if (senha.length < 8 || senha.length > 128) return { erro: 'A senha deve ter de 8 a 128 caracteres.' };
  if (instituicao.length < 2 || instituicao.length > 120) return { erro: 'Informe sua instituição.' };

  return { dados: { nome, email, telefone, senha, instituicao } };
}

const hashCodigo = (codigo) => crypto.createHash('sha256').update(codigo).digest('hex');

function codigoConfere(codigo, hashGuardado) {
  const a = Buffer.from(hashCodigo(codigo));
  const b = Buffer.from(hashGuardado);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function lerCorpo(req, res) {
  try {
    return await lerJson(req);
  } catch (e) {
    json(res, e.status || 400, { erro: e.message });
    return null;
  }
}

// POST /api/organizadores/codigo: valida os dados e envia o código
async function enviarCodigo(req, res) {
  const corpo = await lerCorpo(req, res);
  if (!corpo) return;

  const { erro, dados } = validar(corpo);
  if (erro) return json(res, 400, { erro });

  const existe = db
    .prepare('SELECT 1 FROM usuarios WHERE email = ? OR telefone = ?')
    .get(dados.email, dados.telefone);
  if (existe) return json(res, 409, { erro: 'E-mail ou telefone já cadastrado.' });

  const metodo = corpo.metodo === 'sms' ? 'sms' : 'email';
  const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const expira = new Date(Date.now() + VALIDADE_MS).toISOString();

  db.prepare('DELETE FROM verificacoes WHERE email = ?').run(dados.email);
  db.prepare('INSERT INTO verificacoes (email, codigo_hash, expira_em) VALUES (?, ?, ?)')
    .run(dados.email, hashCodigo(codigo), expira);

  try {
    await envio.enviarCodigo({
      metodo,
      destino: metodo === 'sms' ? dados.telefone : dados.email,
      codigo,
    });
  } catch (e) {
    console.error('Falha ao enviar código:', e);
    db.prepare('DELETE FROM verificacoes WHERE email = ?').run(dados.email);
    return json(res, 502, { erro: 'Não foi possível enviar o código. Tente novamente.' });
  }

  json(res, 200, { ok: true });
}

// POST /api/organizadores: confere o código e cria a conta
async function criar(req, res) {
  const corpo = await lerCorpo(req, res);
  if (!corpo) return;

  const { erro, dados } = validar(corpo);
  if (erro) return json(res, 400, { erro });

  const codigo = String(corpo.codigo ?? '').trim();
  if (!/^\d{6}$/.test(codigo)) return json(res, 400, { erro: 'Digite o código de 6 dígitos.' });

  const v = db.prepare('SELECT * FROM verificacoes WHERE email = ?').get(dados.email);
  if (!v || new Date(v.expira_em) < new Date()) {
    return json(res, 400, { erro: 'Código expirado. Volte e envie um novo.' });
  }
  if (v.tentativas >= MAX_TENTATIVAS) {
    db.prepare('DELETE FROM verificacoes WHERE id = ?').run(v.id);
    return json(res, 429, { erro: 'Muitas tentativas. Volte e envie um novo código.' });
  }
  if (!codigoConfere(codigo, v.codigo_hash)) {
    db.prepare('UPDATE verificacoes SET tentativas = tentativas + 1 WHERE id = ?').run(v.id);
    return json(res, 400, { erro: 'Código incorreto.' });
  }

  const senhaHash = await gerarHash(dados.senha);

  try {
    db.prepare(
      "INSERT INTO usuarios (tipo, nome, email, telefone, senha_hash, instituicao) VALUES ('organizador', ?, ?, ?, ?, ?)"
    ).run(dados.nome, dados.email, dados.telefone, senhaHash, dados.instituicao);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return json(res, 409, { erro: 'E-mail ou telefone já cadastrado.' });
    }
    console.error(e);
    return json(res, 500, { erro: 'Erro interno ao cadastrar.' });
  }

  db.prepare('DELETE FROM verificacoes WHERE email = ?').run(dados.email);
  json(res, 201, { ok: true });
}

module.exports = { enviarCodigo, criar };