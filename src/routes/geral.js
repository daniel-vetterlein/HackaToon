const db = require('../db');
const { json } = require('../utils/http');

// GET /api/saude — usado pelo healthcheck do Railway
function saude(req, res) {
  db.prepare('SELECT 1').get();
  json(res, 200, { ok: true });
}

// GET /api/meu-cronograma — cronograma dos eventos do usuário (organizador ou participante)
function meuCronograma(req, res, usuario) {
  const eventos = db.prepare(`
    SELECT e.id, e.nome FROM eventos e WHERE e.id IN (
      SELECT evento_id FROM evento_organizadores WHERE usuario_id = ?
      UNION
      SELECT q.evento_id FROM equipes q JOIN equipe_membros m ON m.equipe_id = q.id WHERE m.usuario_id = ?
    ) ORDER BY e.id DESC`).all(usuario.id, usuario.id);
  const busca = db.prepare(
    'SELECT titulo, inicio, fim, descricao FROM cronograma WHERE evento_id = ? ORDER BY inicio, id');
  json(res, 200, { eventos: eventos.map((e) => ({ ...e, cronograma: busca.all(e.id) })) });
}

module.exports = {
  rotas: {
    'GET /api/saude': { acesso: 'publico', fn: saude },
    'GET /api/meu-cronograma': { acesso: 'logado', fn: meuCronograma },
  },
};
