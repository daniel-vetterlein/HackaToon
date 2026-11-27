const crypto = require('node:crypto');

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0, 1 (evita confusão)

function gerarCodigo(tamanho = 8) {
  let c = '';
  for (let i = 0; i < tamanho; i++) c += ALFABETO[crypto.randomInt(ALFABETO.length)];
  return c;
}

// Normaliza o que o usuário digitou: maiúsculas, sem espaços/hífens
const normalizarCodigo = (v) => String(v ?? '').trim().toUpperCase().replace(/[\s-]/g, '').slice(0, 20);

// Código de recuperação de senha: 16 caracteres em grupos de 4 (ex.: ABCD-EFGH-JKLM-NPQR)
function gerarCodigoRecuperacao() {
  return gerarCodigo(16).match(/.{4}/g).join('-');
}

const normalizarRecuperacao = (v) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32);

// Guardamos só o hash (SHA-256; o código tem ~80 bits de entropia)
const hashRecuperacao = (codigo) => crypto.createHash('sha256').update(normalizarRecuperacao(codigo)).digest('hex');

function recuperacaoConfere(codigo, hashGuardado) {
  if (!hashGuardado) return false;
  const a = Buffer.from(hashRecuperacao(codigo));
  const b = Buffer.from(hashGuardado);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { gerarCodigo, normalizarCodigo, gerarCodigoRecuperacao, hashRecuperacao, recuperacaoConfere };
