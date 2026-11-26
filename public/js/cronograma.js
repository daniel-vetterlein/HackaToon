window.addEventListener('DOMContentLoaded', async () => {
  const { el, data } = window.hk;
  const alvo = document.getElementById('eventos');

  const aviso = (...filhos) => { alvo.replaceChildren(el('p', { class: 'aviso' }, ...filhos)); };

  try {
    const resp = await fetch('/api/meu-cronograma');
    if (resp.status === 401) {
      return aviso(el('a', { href: '/login?next=/cronograma' }, 'Entre'), ' na sua conta para ver o cronograma dos seus eventos.');
    }
    if (!resp.ok) throw new Error();
    const { eventos } = await resp.json();
    if (!eventos.length) return aviso('Você ainda não participa de nenhum evento.');

    alvo.replaceChildren(...eventos.map((e) => el('section', { class: 'evento-bloco' },
      el('h3', {}, e.nome),
      e.cronograma.length
        ? el('ol', { class: 'linha-tempo' }, ...e.cronograma.map((c) => el('li', {},
            el('small', {}, data(c.inicio) + (c.fim ? ` → ${data(c.fim)}` : '')),
            el('strong', {}, c.titulo),
            c.descricao && el('p', {}, c.descricao))))
        : el('p', { class: 'aviso' }, 'A organização ainda não publicou o cronograma deste evento.'))));
  } catch {
    aviso('Não foi possível carregar o cronograma agora.');
  }
});
