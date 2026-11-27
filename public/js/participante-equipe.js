window.addEventListener('DOMContentLoaded', async () => {
  const { api, el, data } = window.hk;
  const id = Number(new URLSearchParams(location.search).get('id'));
  const base = `/api/participante/equipes/${id}`;
  const $ = (i) => document.getElementById(i);
  if (!id) return (location.href = '/participante');
  let encerrado = false;

  function mostrarMembros(d) {
    const lista = $('membros');
    lista.replaceChildren(...d.membros.map((m) => el('li', {},
      el('span', {}, m.nome,
        m.criador && el('span', { class: 'tag' }, 'CRIADOR'),
        m.voce && el('span', { class: 'tag' }, 'VOCÊ')),
      d.sou_criador && !m.voce && !d.evento.encerrado && el('button', {
        class: 'btn btn-outline btn-mini', type: 'button',
        onclick: async () => {
          if (!window.confirm(`Remover ${m.nome} da equipe?`)) return;
          try { await api('DELETE', `${base}/membros/${m.id}`); await carregar(); }
          catch (e) { $('erro-geral').textContent = e.message; }
        },
      }, 'Remover'))));
  }

  async function carregar() {
    $('erro-geral').textContent = '';
    const d = await api('GET', base);
    document.title = `${d.equipe.nome} | HACKTOON`;
    $('titulo').textContent = d.equipe.nome;
    $('evento').textContent = `Evento: ${d.evento.nome}${d.evento.descricao ? ' — ' + d.evento.descricao : ''}`;
    $('cod-equipe').textContent = d.equipe.codigo;
    mostrarMembros(d);

    encerrado = d.evento.encerrado;
    $('aviso-encerrado').hidden = !encerrado;
    $('sec-colocacoes').hidden = !encerrado;
    $('colocacoes').replaceChildren(...(encerrado ? [window.hk.renderColocacoes(d.colocacoes || [])] : []));
    $('btn-sair').hidden = encerrado;
    document.querySelectorAll('#form-projeto input, #form-projeto textarea, #form-projeto select, #form-projeto button')
      .forEach((c) => (c.disabled = encerrado));
    $('btn-salvar').textContent = encerrado ? 'Evento encerrado' : 'Salvar projeto';

    // seletor de desafio (opcional)
    const sel = $('p-desafio');
    sel.replaceChildren(el('option', { value: '' }, '— Nenhum desafio selecionado —'),
      ...d.desafios.map((x) => el('option', { value: String(x.id) }, x.titulo)));
    if (!d.desafios.length) sel.options[0].textContent = '— O evento ainda não tem desafios —';

    if (d.projeto) {
      $('p-nome').value = d.projeto.nome;
      $('p-desc').value = d.projeto.descricao;
      $('p-github').value = d.projeto.github;
      sel.value = d.projeto.desafio_id ? String(d.projeto.desafio_id) : '';
    }

    $('lista-cron').replaceChildren(...(d.cronograma.length
      ? d.cronograma.map((c) => el('li', { class: 'item' }, el('div', {},
          el('strong', {}, c.titulo),
          el('small', {}, data(c.inicio) + (c.fim ? ` → ${data(c.fim)}` : '')),
          c.descricao && el('small', {}, c.descricao))))
      : [el('li', { class: 'vazio' }, 'O cronograma ainda não foi publicado.')]));
    $('lista-des').replaceChildren(...(d.desafios.length
      ? d.desafios.map((x) => el('li', { class: 'item' }, el('div', {}, el('strong', {}, x.titulo), x.descricao && el('small', {}, x.descricao))))
      : [el('li', { class: 'vazio' }, 'Os desafios ainda não foram publicados.')]));
  }

  try {
    await carregar();
  } catch (e) {
    $('erro-geral').textContent = e.message;
    if (e.message === 'Equipe não encontrada.') setTimeout(() => (location.href = '/participante'), 1500);
    return;
  }

  $('btn-sair').addEventListener('click', async () => {
    if (!window.confirm('Sair da equipe? Se você for o último integrante, a equipe e o projeto serão apagados.')) return;
    try { await api('POST', `${base}/sair`, {}); location.href = '/participante'; }
    catch (e) { $('erro-geral').textContent = e.message; }
  });

  const form = $('form-projeto');
  const erro = form.querySelector('.form-erro');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    erro.textContent = '';
    if (encerrado) return;
    if (!form.checkValidity()) return form.reportValidity();
    try {
      await api('PUT', `${base}/projeto`, {
        nome: $('p-nome').value, descricao: $('p-desc').value, github: $('p-github').value,
        desafio_id: $('p-desafio').value || null,
      });
      erro.textContent = 'Projeto salvo ✔';
    } catch (e) { erro.textContent = e.message; }
  });
});
