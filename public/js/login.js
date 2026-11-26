(() => {
  const form = document.getElementById('form-login');
  const erro = form.querySelector('.form-erro');
  const params = new URLSearchParams(location.search);
  if (params.get('cadastro') === 'ok') document.getElementById('aviso-cadastro').hidden = false;

  // Só aceita destinos internos (evita open redirect)
  const next = params.get('next');
  const destino = next && /^\/[A-Za-z0-9\-_\/]*$/.test(next) ? next : '/painel';

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    erro.textContent = '';
    if (!form.checkValidity()) return form.reportValidity();

    const botao = form.querySelector('[type="submit"]');
    botao.disabled = true;
    try {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.value, senha: form.senha.value }),
      });
      const corpo = await resp.json().catch(() => ({}));
      if (!resp.ok) { erro.textContent = corpo.erro || 'Não foi possível entrar.'; return; }
      location.href = destino;
    } catch {
      erro.textContent = 'Sem conexão com o servidor.';
    } finally {
      botao.disabled = false;
    }
  });
})();
