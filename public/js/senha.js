// Botão "olho" em todos os campos de senha (senha oculta por padrão)
(() => {
  const OLHO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const OLHO_CORTADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.9 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/><path d="m2 2 20 20"/></svg>';

  document.querySelectorAll('input[type="password"]').forEach((input) => {
    const envoltorio = document.createElement('div');
    envoltorio.className = 'campo-senha';
    input.parentNode.insertBefore(envoltorio, input);
    envoltorio.appendChild(input);

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'btn-olho';
    envoltorio.appendChild(botao);

    const atualizar = (visivel) => {
      input.type = visivel ? 'text' : 'password';
      botao.innerHTML = visivel ? OLHO_CORTADO : OLHO;
      botao.setAttribute('aria-pressed', String(visivel));
      botao.setAttribute('aria-label', visivel ? 'Ocultar senha' : 'Mostrar senha');
      botao.title = visivel ? 'Ocultar senha' : 'Mostrar senha';
    };
    botao.addEventListener('click', () => { atualizar(input.type === 'password'); input.focus(); });
    atualizar(false);
  });
})();
