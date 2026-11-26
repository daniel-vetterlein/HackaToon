window.addEventListener('DOMContentLoaded', () => {
  const { api, el } = window.hk;
  const lista = document.getElementById('lista');

  async function carregar() {
    const { eventos } = await api('GET', '/api/organizador/eventos');
    lista.replaceChildren();
    if (!eventos.length) lista.append(el('li', { class: 'vazio' }, 'Você ainda não participa de nenhum evento.'));
    for (const e of eventos) {
      lista.append(el('li', { class: 'item' },
        el('div', {},
          el('strong', {}, e.nome),
          el('small', {}, `${e.dono ? 'Criador' : 'Jurado/organizador'} · ${e.equipes} equipe(s)${e.encerrado ? ' · ENCERRADO' : ''}`)),
        el('a', { class: 'btn btn-outline', href: `/organizador/evento?id=${e.id}` }, 'Abrir')));
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
      try { await fn(form); } catch (e) { erro.textContent = e.message; } finally { btn.disabled = false; }
    });
  }

  ligar('form-criar', async () => {
    const r = await api('POST', '/api/organizador/eventos', {
      nome: document.getElementById('nome').value,
      descricao: document.getElementById('descricao').value,
    });
    location.href = `/organizador/evento?id=${r.id}`;
  });

  ligar('form-entrar', async () => {
    const r = await api('POST', '/api/organizador/eventos/entrar', { codigo: document.getElementById('codigo').value });
    location.href = `/organizador/evento?id=${r.id}`;
  });

  carregar().catch(() => {});
});
