window.addEventListener('DOMContentLoaded', async () => {
  const { api, el, data } = window.hk;
  const id = Number(new URLSearchParams(location.search).get('id'));
  const base = `/api/organizador/eventos/${id}`;
  const $ = (i) => document.getElementById(i);
  const fmtNota = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 }));

  if (!id) return (location.href = '/organizador');
  let eventoEncerrado = false;

  async function carregarEvento() {
    const d = await api('GET', base);
    document.title = `${d.evento.nome} | HACKTOON`;
    $('titulo').textContent = d.evento.nome;
    $('descricao').textContent = d.evento.descricao;
    $('cod-equipe').textContent = d.evento.codigo_equipe;
    $('cod-jurado').textContent = d.evento.codigo_jurado;
    aplicarEstado(d.evento.encerrado, d.colocacoes);
    $('orgs').textContent = d.organizadores.map((o) => o.nome).join(', ');

    const cron = $('lista-cron');
    cron.replaceChildren();
    if (!d.cronograma.length) cron.append(el('li', { class: 'vazio' }, 'Nenhuma atividade cadastrada.'));
    for (const c of d.cronograma) {
      cron.append(el('li', { class: 'item' },
        el('div', {},
          el('strong', {}, c.titulo),
          el('small', {}, data(c.inicio) + (c.fim ? ` → ${data(c.fim)}` : '')),
          c.descricao && el('small', {}, c.descricao)),
        el('button', { class: 'btn btn-outline', type: 'button', onclick: () => remover('cronograma', c.id) }, 'Remover')));
    }

    const des = $('lista-des');
    des.replaceChildren();
    if (!d.desafios.length) des.append(el('li', { class: 'vazio' }, 'Nenhum desafio cadastrado.'));
    for (const x of d.desafios) {
      des.append(el('li', { class: 'item' },
        el('div', {}, el('strong', {}, x.titulo), x.descricao && el('small', {}, x.descricao)),
        el('button', { class: 'btn btn-outline', type: 'button', onclick: () => remover('desafios', x.id) }, 'Remover')));
    }
  }

  function aplicarEstado(encerrado, colocacoes) {
    eventoEncerrado = encerrado;
    $('selo').textContent = encerrado ? 'ENCERRADO' : 'ABERTO';
    $('selo').classList.toggle('encerrado', encerrado);
    $('btn-encerrar').textContent = encerrado ? 'Reabrir evento' : 'Encerrar evento';
    $('btn-encerrar').className = encerrado ? 'btn btn-outline' : 'btn btn-perigo';
    $('btn-encerrar').dataset.encerrado = encerrado ? '1' : '0';
    $('aviso-encerrado').hidden = !encerrado;
    $('sec-colocacoes').hidden = !encerrado;
    $('colocacoes').replaceChildren(...(encerrado && colocacoes ? [window.hk.renderColocacoes(colocacoes)] : []));
  }

  $('btn-encerrar').addEventListener('click', async () => {
    const encerrar = $('btn-encerrar').dataset.encerrado !== '1';
    const msg = encerrar
      ? 'Encerrar o evento? Os participantes não poderão mais editar projetos e verão as notas e colocações.'
      : 'Reabrir o evento? Os participantes poderão editar projetos novamente e as notas voltarão a ficar ocultas.';
    if (!window.confirm(msg)) return;
    $('erro-geral').textContent = '';
    try {
      await api('PUT', `${base}/encerramento`, { encerrado: encerrar });
      await carregarEvento();
      await carregarProjetos();
    } catch (e) { $('erro-geral').textContent = e.message; }
  });

  async function remover(tipo, item) {
    try { await api('DELETE', `${base}/${tipo}/${item}`); await carregarEvento(); await carregarProjetos(); }
    catch (e) { $('erro-geral').textContent = e.message; }
  }

  function cartaoProjeto(p) {
    if (!p.projeto_id) {
      return el('div', { class: 'projeto' },
        el('strong', {}, p.equipe),
        el('small', {}, `Equipe${p.membros ? ' · ' + p.membros : ''} — ainda não enviou o projeto.`));
    }
    const nota = el('input', { type: 'number', min: '0', max: '10', step: '0.1', required: true,
      value: p.minha_nota ?? '', 'aria-label': `Sua nota para ${p.projeto}` });
    const coment = el('input', { type: 'text', maxlength: '1000', placeholder: 'Comentário (opcional)',
      value: p.meu_comentario ?? '' });
    const erro = el('p', { class: 'form-erro', role: 'alert' });
    const resumo = el('span', { class: 'media' }, `Média: ${fmtNota(p.media)} (${p.avaliacoes} avaliação(ões))`);

    const travado = eventoEncerrado;
    nota.disabled = travado; coment.disabled = travado;
    const form = el('form', { class: travado ? 'avalia travado' : 'avalia', novalidate: true,
      onsubmit: async (ev) => {
        ev.preventDefault();
        erro.textContent = '';
        try {
          const r = await api('PUT', `${base}/projetos/${p.projeto_id}/avaliacao`, { nota: nota.value, comentario: coment.value });
          resumo.textContent = `Média: ${fmtNota(r.media)} (${r.avaliacoes} avaliação(ões))`;
          erro.textContent = 'Nota salva ✔';
          setTimeout(carregarProjetos, 600);
        } catch (e) { erro.textContent = e.message; }
      } },
      el('label', {}, 'Sua nota (0–10) ', nota), coment,
      el('button', { class: 'btn btn-primary comic-button', type: 'submit', disabled: travado },
        travado ? 'Notas travadas' : (p.minha_nota == null ? 'Avaliar' : 'Atualizar nota')));

    return el('div', { class: 'projeto' },
      el('div', { class: 'projeto-topo' }, el('strong', {}, p.projeto), resumo),
      el('small', {}, `Equipe ${p.equipe}${p.membros ? ' · ' + p.membros : ''}`),
      p.desafio && el('span', { class: 'desafio-tag' }, `DESAFIO: ${p.desafio}`),
      p.descricao && el('p', {}, p.descricao),
      p.github && /^https?:\/\//i.test(p.github) && el('a', { href: p.github, target: '_blank', rel: 'noopener noreferrer' }, p.github),
      form, erro);
  }

  async function carregarProjetos() {
    const { projetos } = await api('GET', `${base}/projetos`);
    const alvo = $('projetos');
    alvo.replaceChildren();
    if (!projetos.length) alvo.append(el('p', { class: 'vazio' }, 'Nenhuma equipe entrou no evento ainda.'));
    projetos.forEach((p) => alvo.append(cartaoProjeto(p)));
  }

  function ligar(formId, fn) {
    const form = $(formId);
    const erro = form.querySelector('.form-erro');
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      erro.textContent = '';
      if (!form.checkValidity()) return form.reportValidity();
      try { await fn(); form.reset(); await carregarEvento(); } catch (e) { erro.textContent = e.message; }
    });
  }

  ligar('form-cron', () => api('POST', `${base}/cronograma`, {
    titulo: $('c-titulo').value, inicio: $('c-inicio').value, fim: $('c-fim').value, descricao: $('c-desc').value,
  }));
  ligar('form-des', () => api('POST', `${base}/desafios`, { titulo: $('d-titulo').value, descricao: $('d-desc').value }));

  try {
    await carregarEvento();
    await carregarProjetos();
  } catch (e) {
    $('erro-geral').textContent = e.message;
    if (e.message === 'Evento não encontrado.') setTimeout(() => (location.href = '/organizador'), 1500);
  }
});
