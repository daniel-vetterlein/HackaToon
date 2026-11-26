const crypto = require('node:crypto');
const db = require('../db');
const { lerJson, json } = require('../utils/http');

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0, 1 (evita confusão)
const REGEX_DATA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function gerarCodigo(tamanho = 8) {
  let c = '';
  for (let i = 0; i < tamanho; i++) c += ALFABETO[crypto.randomInt(ALFABETO.length)];
  return c;
}

function codigoLivre() {
  for (;;) {
    const c = gerarCodigo();
    const usado = db.prepare(
      `SELECT 1 FROM eventos WHERE codigo_equipe = ? OR codigo_jurado = ?`
    ).get(c, c);
    if (!usado) return c;
  }
}

const texto = (v, max) => String(v ?? '').trim().slice(0, max);

async function corpo(req, res) {
  try {
    return await lerJson(req);
  } catch (e) {
    json(res, e.status || 400, { erro: e.message });
    return null;
  }
}

// Garante que o usuário participa do evento; responde 404 caso contrário
function eventoDoUsuario(req, res, usuario) {
  const evento = db.prepare(`
    SELECT e.* FROM eventos e
    JOIN evento_organizadores o ON o.evento_id = e.id
    WHERE e.id = ? AND o.usuario_id = ?`).get(req.params.id, usuario.id);
  if (!evento) json(res, 404, { erro: 'Evento não encontrado.' });
  return evento;
}

// GET /api/organizador/eventos
function listar(req, res, usuario) {
  const eventos = db.prepare(`
    SELECT e.id, e.nome, e.descricao, e.criado_por = ? AS dono,
      (SELECT COUNT(*) FROM equipes q WHERE q.evento_id = e.id) AS equipes
    FROM eventos e JOIN evento_organizadores o ON o.evento_id = e.id
    WHERE o.usuario_id = ? ORDER BY e.id DESC`).all(usuario.id, usuario.id);
  json(res, 200, { eventos: eventos.map((e) => ({ ...e, dono: !!e.dono })) });
}

// POST /api/organizador/eventos  { nome, descricao }
async function criar(req, res, usuario) {
  const c = await corpo(req, res);
  if (!c) return;
  const nome = texto(c.nome, 120);
  const descricao = texto(c.descricao, 1000);
  if (nome.length < 3) return json(res, 400, { erro: 'Informe o nome do evento (mín. 3 caracteres).' });

  const codigoEquipe = codigoLivre();
  let codigoJurado = codigoLivre();
  while (codigoJurado === codigoEquipe) codigoJurado = codigoLivre();

  db.exec('BEGIN');
  try {
    const { lastInsertRowid: id } = db.prepare(
      'INSERT INTO eventos (nome, descricao, codigo_equipe, codigo_jurado, criado_por) VALUES (?, ?, ?, ?, ?)'
    ).run(nome, descricao, codigoEquipe, codigoJurado, usuario.id);
    db.prepare('INSERT INTO evento_organizadores (evento_id, usuario_id) VALUES (?, ?)').run(id, usuario.id);
    db.exec('COMMIT');
    json(res, 201, { id: Number(id), codigo_equipe: codigoEquipe, codigo_jurado: codigoJurado });
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// POST /api/organizador/eventos/entrar  { codigo }  (código de jurado/organizador)
async function entrar(req, res, usuario) {
  const c = await corpo(req, res);
  if (!c) return;
  const codigo = texto(c.codigo, 20).toUpperCase().replace(/[\s-]/g, '');
  const evento = db.prepare('SELECT id, nome FROM eventos WHERE codigo_jurado = ?').get(codigo);
  if (!evento) {
    const eDeEquipe = db.prepare('SELECT 1 FROM eventos WHERE codigo_equipe = ?').get(codigo);
    return json(res, 404, {
      erro: eDeEquipe
        ? 'Esse é o código de equipes. Use o código de jurados/organizadores.'
        : 'Código de evento inválido.',
    });
  }
  const r = db.prepare('INSERT OR IGNORE INTO evento_organizadores (evento_id, usuario_id) VALUES (?, ?)')
    .run(evento.id, usuario.id);
  json(res, 200, { id: evento.id, nome: evento.nome, ja_era_membro: r.changes === 0 });
}

// GET /api/organizador/eventos/:id
function detalhe(req, res, usuario) {
  const e = eventoDoUsuario(req, res, usuario);
  if (!e) return;
  const cronograma = db.prepare(
    'SELECT id, titulo, inicio, fim, descricao FROM cronograma WHERE evento_id = ? ORDER BY inicio, id'
  ).all(e.id);
  const desafios = db.prepare(
    'SELECT id, titulo, descricao FROM desafios WHERE evento_id = ? ORDER BY id'
  ).all(e.id);
  const organizadores = db.prepare(`
    SELECT u.nome, u.instituicao FROM evento_organizadores o JOIN usuarios u ON u.id = o.usuario_id
    WHERE o.evento_id = ? ORDER BY o.criado_em`).all(e.id);
  json(res, 200, {
    evento: {
      id: e.id, nome: e.nome, descricao: e.descricao,
      codigo_equipe: e.codigo_equipe, codigo_jurado: e.codigo_jurado,
      dono: e.criado_por === usuario.id,
    },
    cronograma, desafios, organizadores,
  });
}

// POST /api/organizador/eventos/:id/cronograma  { titulo, inicio, fim?, descricao? }
async function addCronograma(req, res, usuario) {
  const e = eventoDoUsuario(req, res, usuario);
  if (!e) return;
  const c = await corpo(req, res);
  if (!c) return;
  const titulo = texto(c.titulo, 120);
  const inicio = texto(c.inicio, 16);
  const fim = texto(c.fim, 16);
  if (titulo.length < 2) return json(res, 400, { erro: 'Informe o título da atividade.' });
  if (!REGEX_DATA.test(inicio)) return json(res, 400, { erro: 'Informe a data e hora de início.' });
  if (fim && !REGEX_DATA.test(fim)) return json(res, 400, { erro: 'Data de término inválida.' });
  if (fim && fim < inicio) return json(res, 400, { erro: 'O término deve ser depois do início.' });
  const { lastInsertRowid: id } = db.prepare(
    'INSERT INTO cronograma (evento_id, titulo, inicio, fim, descricao) VALUES (?, ?, ?, ?, ?)'
  ).run(e.id, titulo, inicio, fim || null, texto(c.descricao, 500));
  json(res, 201, { id: Number(id) });
}

// DELETE /api/organizador/eventos/:id/cronograma/:item
function delCronograma(req, res, usuario) {
  const e = eventoDoUsuario(req, res, usuario);
  if (!e) return;
  db.prepare('DELETE FROM cronograma WHERE id = ? AND evento_id = ?').run(req.params.item, e.id);
  json(res, 200, { ok: true });
}

// POST /api/organizador/eventos/:id/desafios  { titulo, descricao? }
async function addDesafio(req, res, usuario) {
  const e = eventoDoUsuario(req, res, usuario);
  if (!e) return;
  const c = await corpo(req, res);
  if (!c) return;
  const titulo = texto(c.titulo, 120);
  if (titulo.length < 2) return json(res, 400, { erro: 'Informe o título do desafio.' });
  const { lastInsertRowid: id } = db.prepare(
    'INSERT INTO desafios (evento_id, titulo, descricao) VALUES (?, ?, ?)'
  ).run(e.id, titulo, texto(c.descricao, 2000));
  json(res, 201, { id: Number(id) });
}

// DELETE /api/organizador/eventos/:id/desafios/:item
function delDesafio(req, res, usuario) {
  const e = eventoDoUsuario(req, res, usuario);
  if (!e) return;
  db.prepare('DELETE FROM desafios WHERE id = ? AND evento_id = ?').run(req.params.item, e.id);
  json(res, 200, { ok: true });
}

// GET /api/organizador/eventos/:id/projetos
// Equipes do evento com o projeto enviado, média das notas e a nota do usuário atual.
function projetos(req, res, usuario) {
  const e = eventoDoUsuario(req, res, usuario);
  if (!e) return;
  const linhas = db.prepare(`
    SELECT q.id AS equipe_id, q.nome AS equipe,
      (SELECT GROUP_CONCAT(u.nome, ', ') FROM equipe_membros m JOIN usuarios u ON u.id = m.usuario_id
        WHERE m.equipe_id = q.id) AS membros,
      p.id AS projeto_id, p.nome AS projeto, p.descricao, p.github,
      (SELECT ROUND(AVG(nota), 2) FROM avaliacoes a WHERE a.projeto_id = p.id) AS media,
      (SELECT COUNT(*) FROM avaliacoes a WHERE a.projeto_id = p.id) AS avaliacoes,
      (SELECT nota FROM avaliacoes a WHERE a.projeto_id = p.id AND a.avaliador_id = ?) AS minha_nota,
      (SELECT comentario FROM avaliacoes a WHERE a.projeto_id = p.id AND a.avaliador_id = ?) AS meu_comentario
    FROM equipes q LEFT JOIN projetos p ON p.equipe_id = q.id
    WHERE q.evento_id = ?
    ORDER BY (media IS NULL), media DESC, q.nome`).all(usuario.id, usuario.id, e.id);
  json(res, 200, { projetos: linhas });
}

// PUT /api/organizador/eventos/:id/projetos/:projeto/avaliacao  { nota, comentario? }
async function avaliar(req, res, usuario) {
  const e = eventoDoUsuario(req, res, usuario);
  if (!e) return;
  const c = await corpo(req, res);
  if (!c) return;

  const projeto = db.prepare(`
    SELECT p.id FROM projetos p JOIN equipes q ON q.id = p.equipe_id
    WHERE p.id = ? AND q.evento_id = ?`).get(req.params.projeto, e.id);
  if (!projeto) return json(res, 404, { erro: 'Projeto não encontrado neste evento.' });

  const bruto = typeof c.nota === 'string' ? c.nota.replace(',', '.').trim() : c.nota;
  const nota = bruto === '' || bruto === null || bruto === undefined ? NaN : Number(bruto);
  if (!Number.isFinite(nota) || nota < 0 || nota > 10) {
    return json(res, 400, { erro: 'A nota deve ser um número de 0 a 10.' });
  }
  const arredondada = Math.round(nota * 10) / 10;

  db.prepare(`
    INSERT INTO avaliacoes (projeto_id, avaliador_id, nota, comentario) VALUES (?, ?, ?, ?)
    ON CONFLICT (projeto_id, avaliador_id)
    DO UPDATE SET nota = excluded.nota, comentario = excluded.comentario, atualizado_em = CURRENT_TIMESTAMP`
  ).run(projeto.id, usuario.id, arredondada, texto(c.comentario, 1000));

  const r = db.prepare('SELECT ROUND(AVG(nota), 2) AS media, COUNT(*) AS avaliacoes FROM avaliacoes WHERE projeto_id = ?')
    .get(projeto.id);
  json(res, 200, { nota: arredondada, media: r.media, avaliacoes: r.avaliacoes });
}

const P = '/api/organizador/eventos';
const org = (fn) => ({ acesso: 'organizador', fn });

module.exports = {
  rotas: {
    [`GET ${P}`]: org(listar),
    [`POST ${P}`]: org(criar),
    [`POST ${P}/entrar`]: org(entrar),
    [`GET ${P}/:id`]: org(detalhe),
    [`POST ${P}/:id/cronograma`]: org(addCronograma),
    [`DELETE ${P}/:id/cronograma/:item`]: org(delCronograma),
    [`POST ${P}/:id/desafios`]: org(addDesafio),
    [`DELETE ${P}/:id/desafios/:item`]: org(delDesafio),
    [`GET ${P}/:id/projetos`]: org(projetos),
    [`PUT ${P}/:id/projetos/:projeto/avaliacao`]: org(avaliar),
  },
};
