(() => {
  const form = document.querySelector('[data-cadastro]');
  if (!form) return;

  const etapas = [...form.querySelectorAll('[data-etapa]')];
  const passos = [...document.querySelectorAll('[data-passo]')];
  const contador = document.getElementById('contador');
  const erro = form.querySelector('.form-erro');
  let atual = 0;

  const definirErro = (mensagem = '') => { if (erro) erro.textContent = mensagem; };

  function mostrar(i) {
    if (i < 0 || i >= etapas.length) return;
    atual = i;
    etapas.forEach((e, n) => (e.hidden = n !== i));
    passos.forEach((p, n) => {
      p.classList.toggle('ativo', n === i);
      p.classList.toggle('feito', n < i);
    });
    if (contador) contador.textContent = `${i + 1}/${etapas.length}`;
    definirErro('');
  }

  function etapaValida() {
    for (const campo of etapas[atual].querySelectorAll('input, select, textarea')) {
      if (!campo.disabled && !campo.checkValidity()) {
        campo.reportValidity();
        return false;
      }
    }
    const { senha, confirmar_senha: conf } = form.elements;
    if (atual === 0 && senha && conf && senha.value !== conf.value) {
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
    if (dados.telefone) {
      dados.telefone = String(dados.telefone).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    }
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
        definirErro(corpo.erro || 'Não foi possível concluir o cadastro.');
        return false;
      }
      return true;
    } catch {
      definirErro('Sem conexão com o servidor.');
      return false;
    }
  }

  form.addEventListener('click', (ev) => {
    const botao = ev.target.closest('[data-acao]');
    if (!botao) return;
    if (botao.dataset.acao === 'voltar') return mostrar(atual - 1);
    if (botao.dataset.acao === 'avancar' && etapaValida()) mostrar(atual + 1);
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (atual < etapas.length - 1) {
      etapas[atual].querySelector('[data-acao="avancar"]')?.click();
      return;
    }
    if (!etapaValida()) return;

    const botao = ev.submitter || form.querySelector('[type="submit"]');
    if (botao) botao.disabled = true;
    const ok = await enviar(form.dataset.api);
    if (botao) botao.disabled = false;

    if (ok) location.href = '/login?cadastro=ok';
  });

  mostrar(0);
})();
