const argon2 = require('argon2');

function gerarHash(senha) {
  return argon2.hash(senha, { type: argon2.argon2id });
}

async function verificarSenha(senha, hashArmazenado) {
  try {
    return await argon2.verify(hashArmazenado, senha);
  } catch {
    return false;
  }
}

module.exports = { gerarHash, verificarSenha };