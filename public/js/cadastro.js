(() => {
  const form = document.querySelector('[data-cadastro]');
  if (!form) return;

  const etapas = [...form.querySelectorAll('[data-etapa]')];
  const passos = [...document.querySelectorAll('[data-passo]')];
  const contador = document.getElementById('contador');
  const erro = form.querySelector('.form-erro');
  let atual = 0;

  function mostrar(i) {
    atual = i;
    etapas.forEach((e, n) => (e.hidden = n !== i));
    passos.forEach((p, n) => {
      p.classList.toggle('ativo', n === i);
      p.classList.toggle('feito', n < i);
    });
    if (contador) contador.textContent = `${i + 1}/${etapas.length}`;
    erro.textContent = '';
  }

  function etapaValida() {
    for (const campo of etapas[atual].querySelectorAll('input')) {
      if (!campo.checkValidity()) { campo.reportValidity(); return false; }
    }
    const { senha, confirmar_senha: conf } = form.elements;
    if (atual === 0 && conf && senha.value !== conf.value) {
      conf.setCustomValidity('As senhas não coincidem.');
      conf.reportValidity();
      conf.setCustomValidity('');
      return false;
    }
    return true;
  }

  function coletar() {
    const fd = new FormData(form);
    const dados = {};
    for (const chave of new Set(fd.keys())) {
      const valores = fd.getAll(chave);
      dados[chave] = chave === 'habilidades' ? valores : valores[0];
    }
    delete dados.confirmar_senha;
    return dados;
  }

  async function enviar(url) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coletar()),
      });
      const corpo = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        erro.textContent = corpo.erro || 'Não foi possível concluir o cadastro.';
        return false;
      }
      return true;
    } catch {
      erro.textContent = 'Sem conexão com o servidor.';
      return false;
    }
  }

  form.addEventListener('click', async (ev) => {
    const botao = ev.target.closest('[data-acao]');
    if (!botao) return;

    if (botao.dataset.acao === 'voltar') return mostrar(atual - 1);
    if (botao.dataset.acao !== 'avancar' || !etapaValida()) return;

    if (botao.dataset.api) {                 // ex.: enviar o código antes de avançar
      botao.disabled = true;
      erro.textContent = '';
      const ok = await enviar(botao.dataset.api);
      botao.disabled = false;
      if (!ok) return;
    }
    mostrar(atual + 1);
  });

  // o texto do botão acompanha o método de verificação escolhido
  const rotulo = form.querySelector('[data-rotulo-metodo]');
  form.querySelectorAll('input[name="metodo"]').forEach((r) =>
    r.addEventListener('change', () => {
      rotulo.textContent = r.value === 'sms' ? 'Enviar código por SMS' : 'Enviar código por e-mail';
    })
  );

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (atual < etapas.length - 1) {         // Enter nos passos iniciais = clicar em "avançar"
      etapas[atual].querySelector('[data-acao="avancar"]')?.click();
      return;
    }
    if (!etapaValida()) return;

    const botao = ev.submitter;
    botao.disabled = true;
    const ok = await enviar(form.dataset.api);
    botao.disabled = false;
    if (ok) location.href = '/login';
  });

  mostrar(0);
})();