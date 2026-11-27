const db = require('../db');
const { lerJson, json } = require('../utils/http');
const { gerarHash, verificarSenha } = require('../utils/senha');
const sessao = require('../utils/sessao');
const { gerarCodigoRecuperacao, hashRecuperacao, recuperacaoConfere } = require('../utils/codigo');

// Limite simples de tentativas por IP+e-mail (em memória): 8 falhas / 10 min
const falhas = new Map();

// Atrás do proxy do Railway, o IP real é o último valor de X-Forwarded-For (anexado pelo proxy)
function ipCliente(req) {
  const xff = String(req.headers['x-forwarded-for'] || '').split(',').map((v) => v.trim()).filter(Boolean);
  return xff.length ? xff[xff.length - 1] : req.socket.remoteAddress;
}
const JANELA_MS = 10 * 60 * 1000;
const MAX_FALHAS = 8;

function bloqueado(chave) {
  const f = falhas.get(chave);
  if (!f) return false;
  if (Date.now() - f.inicio > JANELA_MS) { falhas.delete(chave); return false; }
  return f.n >= MAX_FALHAS;
}
function registrarFalha(chave) {
  const f = falhas.get(chave);
  if (!f || Date.now() - f.inicio > JANELA_MS) falhas.set(chave, { n: 1, inicio: Date.now() });
  else f.n++;
}

// Hash falso para igualar o tempo de resposta quando o e-mail não existe
let hashFalso;
const obterHashFalso = async () => (hashFalso ??= await gerarHash('senha-falsa-para-tempo-constante'));

async function login(req, res) {
  let corpo;
  try { corpo = await lerJson(req); } catch (e) { return json(res, e.status || 400, { erro: e.message }); }

  const email = String(corpo.email ?? '').trim();
  const senha = String(corpo.senha ?? '');
  if (!email || !senha || senha.length > 128) return json(res, 400, { erro: 'Informe e-mail e senha.' });

  const chave = `${ipCliente(req)}|${email.toLowerCase()}`;
  if (bloqueado(chave)) return json(res, 429, { erro: 'Muitas tentativas. Aguarde alguns minutos.' });

  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  const ok = await verificarSenha(senha, usuario ? usuario.senha_hash : await obterHashFalso());
  if (!usuario || !ok) {
    registrarFalha(chave);
    return json(res, 401, { erro: 'E-mail ou senha incorretos.' });
  }

  falhas.delete(chave);
  sessao.criarSessao(req, res, usuario.id);
  json(res, 200, { ok: true, usuario: { id: usuario.id, tipo: usuario.tipo, nome: usuario.nome } });
}

// POST /api/recuperar-senha  { email, codigo, senha }
// Redefine a senha com o código de recuperação; o código é de uso único e um novo é devolvido.
async function recuperarSenha(req, res) {
  let corpo;
  try { corpo = await lerJson(req); } catch (e) { return json(res, e.status || 400, { erro: e.message }); }

  const email = String(corpo.email ?? '').trim();
  const codigo = String(corpo.codigo ?? '');
  const senha = String(corpo.senha ?? '');
  if (!email || !codigo) return json(res, 400, { erro: 'Informe o e-mail e o código de recuperação.' });
  if (senha.length < 8 || senha.length > 128) return json(res, 400, { erro: 'A nova senha deve ter de 8 a 128 caracteres.' });

  const chave = `rec|${ipCliente(req)}|${email.toLowerCase()}`;
  if (bloqueado(chave)) return json(res, 429, { erro: 'Muitas tentativas. Aguarde alguns minutos.' });

  const usuario = db.prepare('SELECT id, codigo_recuperacao_hash FROM usuarios WHERE email = ?').get(email);
  if (!usuario || !recuperacaoConfere(codigo, usuario.codigo_recuperacao_hash)) {
    registrarFalha(chave);
    return json(res, 400, { erro: 'E-mail ou código de recuperação incorretos.' });
  }

  const novoCodigo = gerarCodigoRecuperacao();
  const senhaHash = await gerarHash(senha);
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE usuarios SET senha_hash = ?, codigo_recuperacao_hash = ? WHERE id = ?')
      .run(senhaHash, hashRecuperacao(novoCodigo), usuario.id);
    db.prepare('DELETE FROM sessoes WHERE usuario_id = ?').run(usuario.id); // derruba sessões antigas
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  falhas.delete(chave);
  json(res, 200, { ok: true, codigo_recuperacao: novoCodigo });
}

function logout(req, res) {
  sessao.encerrarSessao(req, res);
  json(res, 200, { ok: true });
}

function eu(req, res) {
  const usuario = sessao.usuarioDaRequisicao(req);
  if (!usuario) return json(res, 401, { erro: 'Não autenticado.' });
  json(res, 200, { usuario });
}

module.exports = { login, logout, eu, recuperarSenha };
