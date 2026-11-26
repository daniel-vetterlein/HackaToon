const crypto = require('node:crypto');

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0, 1 (evita confusão)

function gerarCodigo(tamanho = 8) {
  let c = '';
  for (let i = 0; i < tamanho; i++) c += ALFABETO[crypto.randomInt(ALFABETO.length)];
  return c;
}

// Normaliza o que o usuário digitou: maiúsculas, sem espaços/hífens
const normalizarCodigo = (v) => String(v ?? '').trim().toUpperCase().replace(/[\s-]/g, '').slice(0, 20);

module.exports = { gerarCodigo, normalizarCodigo };
