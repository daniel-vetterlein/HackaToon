window.addEventListener('DOMContentLoaded', async () => {
  const { api, el, data } = window.hk;
  const id = Number(new URLSearchParams(location.search).get('id'));
  const $ = (i) => document.getElementById(i);
  if (!id) return (location.href = '/participante');
  let encerrado = false;

  try {
    const d = await api('GET', `/api/participante/equipes/${id}`);
    document.title = `${d.equipe.nome} | HACKTOON`;
    $('titulo').textContent = d.equipe.nome;
    $('evento').textContent = `Evento: ${d.evento.nome}${d.evento.descricao ? ' — ' + d.evento.descricao : ''}`;
    $('cod-equipe').textContent = d.equipe.codigo;
    $('membros').textContent = d.membros.join(', ');

    if (d.evento.encerrado) {
      encerrado = true;
      $('aviso-encerrado').hidden = false;
      $('sec-colocacoes').hidden = false;
      $('colocacoes').replaceChildren(window.hk.renderColocacoes(d.colocacoes || []));
      document.querySelectorAll('#form-projeto input, #form-projeto textarea, #form-projeto button').forEach((c) => (c.disabled = true));
      $('btn-salvar').textContent = 'Evento encerrado';
    }

    if (d.projeto) {
      $('p-nome').value = d.projeto.nome;
      $('p-desc').value = d.projeto.descricao;
      $('p-github').value = d.projeto.github;
    }

    const cron = $('lista-cron');
    if (!d.cronograma.length) cron.append(el('li', { class: 'vazio' }, 'O cronograma ainda não foi publicado.'));
    for (const c of d.cronograma) {
      cron.append(el('li', { class: 'item' }, el('div', {},
        el('strong', {}, c.titulo),
        el('small', {}, data(c.inicio) + (c.fim ? ` → ${data(c.fim)}` : '')),
        c.descricao && el('small', {}, c.descricao))));
    }
    const des = $('lista-des');
    if (!d.desafios.length) des.append(el('li', { class: 'vazio' }, 'Os desafios ainda não foram publicados.'));
    for (const x of d.desafios) {
      des.append(el('li', { class: 'item' }, el('div', {}, el('strong', {}, x.titulo), x.descricao && el('small', {}, x.descricao))));
    }
  } catch (e) {
    $('erro-geral').textContent = e.message;
    if (e.message === 'Equipe não encontrada.') setTimeout(() => (location.href = '/participante'), 1500);
    return;
  }

  const form = $('form-projeto');
  const erro = form.querySelector('.form-erro');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    erro.textContent = '';
    if (encerrado) return;
    if (!form.checkValidity()) return form.reportValidity();
    try {
      await api('PUT', `/api/participante/equipes/${id}/projeto`, {
        nome: $('p-nome').value, descricao: $('p-desc').value, github: $('p-github').value,
      });
      erro.textContent = 'Projeto salvo ✔';
    } catch (e) { erro.textContent = e.message; }
  });
});
