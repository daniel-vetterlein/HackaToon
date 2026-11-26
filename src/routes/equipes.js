const db = require('../db');
const { lerJson, json } = require('../utils/http');
const { gerarCodigo, normalizarCodigo } = require('../utils/codigo');
const { colocacoes } = require('../utils/ranking');

const texto = (v, max) => String(v ?? '').trim().slice(0, max);
const REGEX_GITHUB = /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9._-]+(\/[A-Za-z0-9._\-\/]*)?$/;

async function corpo(req, res) {
  try {
    return await lerJson(req);
  } catch (e) {
    json(res, e.status || 400, { erro: e.message });
    return null;
  }
}

function codigoEquipeLivre() {
  for (;;) {
    const c = gerarCodigo();
    if (!db.prepare('SELECT 1 FROM equipes WHERE codigo = ?').get(c)) return c;
  }
}

// Equipe só é acessível por quem é membro; senão 404
function equipeDoUsuario(req, res, usuario) {
  const eq = db.prepare(`
    SELECT q.* FROM equipes q JOIN equipe_membros m ON m.equipe_id = q.id
    WHERE q.id = ? AND m.usuario_id = ?`).get(req.params.id, usuario.id);
  if (!eq) json(res, 404, { erro: 'Equipe não encontrada.' });
  return eq;
}

const jaTemEquipeNoEvento = (eventoId, usuarioId) => !!db.prepare(`
  SELECT 1 FROM equipe_membros m JOIN equipes q ON q.id = m.equipe_id
  WHERE q.evento_id = ? AND m.usuario_id = ?`).get(eventoId, usuarioId);

// GET /api/participante/equipes
function listar(req, res, usuario) {
  const equipes = db.prepare(`
    SELECT q.id, q.nome, q.codigo, e.nome AS evento, e.encerrado,
      (SELECT COUNT(*) FROM equipe_membros m2 WHERE m2.equipe_id = q.id) AS membros,
      (SELECT p.nome FROM projetos p WHERE p.equipe_id = q.id) AS projeto
    FROM equipe_membros m JOIN equipes q ON q.id = m.equipe_id JOIN eventos e ON e.id = q.evento_id
    WHERE m.usuario_id = ? ORDER BY q.id DESC`).all(usuario.id);
  json(res, 200, { equipes: equipes.map((q) => ({ ...q, encerrado: !!q.encerrado })) });
}

// POST /api/participante/equipes  { codigo_evento, nome }
async function criar(req, res, usuario) {
  const c = await corpo(req, res);
  if (!c) return;
  const nome = texto(c.nome, 80);
  if (nome.length < 2) return json(res, 400, { erro: 'Informe o nome da equipe (mín. 2 caracteres).' });

  const evento = db.prepare('SELECT id FROM eventos WHERE codigo_equipe = ?').get(normalizarCodigo(c.codigo_evento));
  if (!evento) return json(res, 404, { erro: 'Código do evento inválido. Use o código de equipes do evento.' });
  if (jaTemEquipeNoEvento(evento.id, usuario.id)) {
    return json(res, 409, { erro: 'Você já faz parte de uma equipe neste evento.' });
  }

  const codigo = codigoEquipeLivre();
  db.exec('BEGIN');
  try {
    const { lastInsertRowid: id } = db.prepare(
      'INSERT INTO equipes (evento_id, nome, codigo, criado_por) VALUES (?, ?, ?, ?)'
    ).run(evento.id, nome, codigo, usuario.id);
    db.prepare('INSERT INTO equipe_membros (equipe_id, usuario_id) VALUES (?, ?)').run(id, usuario.id);
    db.exec('COMMIT');
    json(res, 201, { id: Number(id), codigo });
  } catch (e) {
    db.exec('ROLLBACK');
    if (String(e.message).includes('UNIQUE')) {
      return json(res, 409, { erro: 'Já existe uma equipe com esse nome neste evento.' });
    }
    throw e;
  }
}

// POST /api/participante/equipes/entrar  { codigo }  (apenas o código da equipe)
async function entrar(req, res, usuario) {
  const c = await corpo(req, res);
  if (!c) return;
  const eq = db.prepare('SELECT id, evento_id, nome FROM equipes WHERE codigo = ?').get(normalizarCodigo(c.codigo));
  if (!eq) return json(res, 404, { erro: 'Código de equipe inválido.' });

  const ja = db.prepare('SELECT 1 FROM equipe_membros WHERE equipe_id = ? AND usuario_id = ?').get(eq.id, usuario.id);
  if (ja) return json(res, 200, { id: eq.id, nome: eq.nome, ja_era_membro: true });
  if (jaTemEquipeNoEvento(eq.evento_id, usuario.id)) {
    return json(res, 409, { erro: 'Você já faz parte de outra equipe neste evento.' });
  }
  db.prepare('INSERT INTO equipe_membros (equipe_id, usuario_id) VALUES (?, ?)').run(eq.id, usuario.id);
  json(res, 200, { id: eq.id, nome: eq.nome, ja_era_membro: false });
}

// GET /api/participante/equipes/:id  — equipe, evento (cronograma/desafios) e projeto
function detalhe(req, res, usuario) {
  const eq = equipeDoUsuario(req, res, usuario);
  if (!eq) return;
  const evento = db.prepare('SELECT id, nome, descricao, encerrado FROM eventos WHERE id = ?').get(eq.evento_id);
  const encerrado = !!evento.encerrado;
  const membros = db.prepare(`
    SELECT u.nome FROM equipe_membros m JOIN usuarios u ON u.id = m.usuario_id
    WHERE m.equipe_id = ? ORDER BY u.nome`).all(eq.id).map((m) => m.nome);
  const cronograma = db.prepare(
    'SELECT id, titulo, inicio, fim, descricao FROM cronograma WHERE evento_id = ? ORDER BY inicio, id'
  ).all(eq.evento_id);
  const desafios = db.prepare(
    'SELECT id, titulo, descricao FROM desafios WHERE evento_id = ? ORDER BY id'
  ).all(eq.evento_id);
  const projeto = db.prepare('SELECT nome, descricao, github FROM projetos WHERE equipe_id = ?').get(eq.id) || null;
  // Notas e ranking só são liberados após o encerramento do evento
  json(res, 200, {
    equipe: { id: eq.id, nome: eq.nome, codigo: eq.codigo },
    evento: { ...evento, encerrado },
    colocacoes: encerrado ? colocacoes(eq.evento_id) : null,
    membros, cronograma, desafios, projeto,
  });
}

// PUT /api/participante/equipes/:id/projeto  { nome, descricao, github }
async function salvarProjeto(req, res, usuario) {
  const eq = equipeDoUsuario(req, res, usuario);
  if (!eq) return;
  const aberto = db.prepare('SELECT encerrado FROM eventos WHERE id = ?').get(eq.evento_id);
  if (aberto.encerrado) {
    return json(res, 403, { erro: 'O evento foi encerrado. Não é mais possível enviar ou editar projetos.' });
  }
  const c = await corpo(req, res);
  if (!c) return;
  const nome = texto(c.nome, 120);
  const descricao = texto(c.descricao, 3000);
  const github = texto(c.github, 300);
  if (nome.length < 2) return json(res, 400, { erro: 'Informe o nome do projeto.' });
  if (github && !REGEX_GITHUB.test(github)) {
    return json(res, 400, { erro: 'O link deve ser um endereço do GitHub (https://github.com/usuario/repositorio).' });
  }
  db.prepare(`
    INSERT INTO projetos (equipe_id, nome, descricao, github) VALUES (?, ?, ?, ?)
    ON CONFLICT (equipe_id)
    DO UPDATE SET nome = excluded.nome, descricao = excluded.descricao, github = excluded.github,
                  atualizado_em = CURRENT_TIMESTAMP`).run(eq.id, nome, descricao, github);
  json(res, 200, { ok: true });
}

const P = '/api/participante/equipes';
const part = (fn) => ({ acesso: 'participante', fn });

module.exports = {
  rotas: {
    [`GET ${P}`]: part(listar),
    [`POST ${P}`]: part(criar),
    [`POST ${P}/entrar`]: part(entrar),
    [`GET ${P}/:id`]: part(detalhe),
    [`PUT ${P}/:id/projeto`]: part(salvarProjeto),
  },
};
