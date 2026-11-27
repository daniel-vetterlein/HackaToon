window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-recuperar');
  const erro = form.querySelector('.form-erro');

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    erro.textContent = '';
    if (!form.checkValidity()) return form.reportValidity();
    if (form.senha.value !== form.confirmar_senha.value) {
      erro.textContent = 'As senhas não coincidem.';
      return;
    }

    const botao = form.querySelector('[type="submit"]');
    botao.disabled = true;
    try {
      const r = await window.hk.api('POST', '/api/recuperar-senha', {
        email: form.email.value, codigo: form.codigo.value, senha: form.senha.value,
      });
      // O código usado deixa de valer: mostramos o novo, também uma única vez
      form.closest('.cadastro-card').replaceChildren(window.hk.painelCodigoRecuperacao({
        titulo: 'SENHA REDEFINIDA!',
        codigo: r.codigo_recuperacao,
        textoBotao: 'Ir para o login',
        destino: '/login',
      }));
      document.querySelector('.painel-codigo .etapa-sub').textContent =
        'Seu código de recuperação anterior foi invalidado. Este é o novo código — ele aparece somente agora, então anote ou copie em um lugar seguro.';
    } catch (e) {
      erro.textContent = e.message;
    } finally {
      botao.disabled = false;
    }
  });
});
