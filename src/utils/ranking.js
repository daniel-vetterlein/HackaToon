const db = require('../db');

// Colocações finais de um evento: todas as equipes, da maior para a menor média.
// Empates recebem a mesma posição (1, 1, 3...). Equipes sem nota ficam no fim, sem posição.
function colocacoes(eventoId) {
  const linhas = db.prepare(`
    SELECT q.nome AS equipe, p.nome AS projeto, p.github,
      (SELECT ROUND(AVG(a.nota), 2) FROM avaliacoes a WHERE a.projeto_id = p.id) AS media
    FROM equipes q LEFT JOIN projetos p ON p.equipe_id = q.id
    WHERE q.evento_id = ?
    ORDER BY (media IS NULL), media DESC, q.nome COLLATE NOCASE`).all(eventoId);

  let anterior = null;
  let posicao = 0;
  return linhas.map((l, i) => {
    if (l.media == null) return { ...l, posicao: null };
    if (l.media !== anterior) { posicao = i + 1; anterior = l.media; }
    return { ...l, posicao };
  });
}

module.exports = { colocacoes };
