const db = require('../db');
const { lerJson, json } = require('../utils/http');
const { gerarHash } = require('../utils/senha');
const { normalizarTelefone } = require('../utils/telefone');
const { gerarCodigoRecuperacao, hashRecuperacao } = require('../utils/codigo');

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validar(corpo) {
  const nome = String(corpo.nome ?? '').trim();
  const email = String(corpo.email ?? '').trim();
  const telefone = normalizarTelefone(corpo.telefone);
  const senha = String(corpo.senha ?? '');
  const instituicao = String(corpo.instituicao ?? '').trim();

  if (nome.length < 2 || nome.length > 120) return { erro: 'Informe seu nome completo.' };
  if (!REGEX_EMAIL.test(email) || email.length > 160) return { erro: 'Informe um e-mail válido.' };
  if (!telefone) return { erro: 'Informe o telefone com +55, DDD e número.' };
  if (senha.length < 8 || senha.length > 128) return { erro: 'A senha deve ter de 8 a 128 caracteres.' };
  if (instituicao.length < 2 || instituicao.length > 120) return { erro: 'Informe sua instituição.' };

  return { dados: { nome, email, telefone, senha, instituicao } };
}

async function lerCorpo(req, res) {
  try {
    return await lerJson(req);
  } catch (e) {
    json(res, e.status || 400, { erro: e.message });
    return null;
  }
}

// POST /api/organizadores: cria a conta
async function criar(req, res) {
  const corpo = await lerCorpo(req, res);
  if (!corpo) return;

  const { erro, dados } = validar(corpo);
  if (erro) return json(res, 400, { erro });

  const senhaHash = await gerarHash(dados.senha);
  const codigoRecuperacao = gerarCodigoRecuperacao();

  try {
    db.prepare(
      "INSERT INTO usuarios (tipo, nome, email, telefone, senha_hash, instituicao, codigo_recuperacao_hash) VALUES ('organizador', ?, ?, ?, ?, ?, ?)"
    ).run(dados.nome, dados.email, dados.telefone, senhaHash, dados.instituicao, hashRecuperacao(codigoRecuperacao));
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return json(res, 409, { erro: 'E-mail ou telefone já cadastrado.' });
    }
    console.error(e);
    return json(res, 500, { erro: 'Erro interno ao cadastrar.' });
  }

  // O código de recuperação é exibido uma única vez, logo após o cadastro
  json(res, 201, { ok: true, codigo_recuperacao: codigoRecuperacao });
}

module.exports = { criar };