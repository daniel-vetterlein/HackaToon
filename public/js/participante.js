window.addEventListener('DOMContentLoaded', () => {
  const { api, el } = window.hk;
  const lista = document.getElementById('lista');

  async function carregar() {
    const { equipes } = await api('GET', '/api/participante/equipes');
    lista.replaceChildren();
    if (!equipes.length) lista.append(el('li', { class: 'vazio' }, 'Você ainda não faz parte de nenhuma equipe.'));
    for (const q of equipes) {
      lista.append(el('li', { class: 'item' },
        el('div', {},
          el('strong', {}, q.nome),
          el('small', {}, `${q.evento} · ${q.membros} integrante(s) · ${q.projeto ? 'Projeto: ' + q.projeto : 'sem projeto ainda'}${q.encerrado ? ' · EVENTO ENCERRADO' : ''}`)),
        el('a', { class: 'btn btn-outline', href: `/participante/equipe?id=${q.id}` }, 'Abrir')));
    }
  }

  function ligar(formId, fn) {
    const form = document.getElementById(formId);
    const erro = form.querySelector('.form-erro');
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      erro.textContent = '';
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      try { await fn(); } catch (e) { erro.textContent = e.message; } finally { btn.disabled = false; }
    });
  }

  ligar('form-criar', async () => {
    const r = await api('POST', '/api/participante/equipes', {
      codigo_evento: document.getElementById('codigo-evento').value,
      nome: document.getElementById('nome-equipe').value,
    });
    location.href = `/participante/equipe?id=${r.id}`;
  });

  ligar('form-entrar', async () => {
    const r = await api('POST', '/api/participante/equipes/entrar', { codigo: document.getElementById('codigo-equipe').value });
    location.href = `/participante/equipe?id=${r.id}`;
  });

  carregar().catch(() => {});
});
