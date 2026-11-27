(() => {
  const form = document.querySelector('[data-cadastro]');
  if (!form) return;

  const etapas = [...form.querySelectorAll('[data-etapa]')];
  const passos = [...document.querySelectorAll('[data-passo]')];
  const contador = document.getElementById('contador');
  const erro = form.querySelector('.form-erro');
  let atual = 0;

  // Máscara do telefone: sempre "+55 DD 99999-9999" (ou "+55 DD 9999-9999"); o servidor guarda só os dígitos
  const telefone = form.elements.telefone;
  const formatarTelefone = (valor) => {
    let d = String(valor).replace(/\D/g, '');
    if (d.startsWith('55')) d = d.slice(2); // o +55 é fixo
    d = d.slice(0, 11);
    if (d.length === 0) return '+55 ';
    if (d.length <= 2) return `+55 ${d}`;
    const resto = d.slice(2);
    const corte = d.length === 11 ? 5 : 4;
    return resto.length > corte
      ? `+55 ${d.slice(0, 2)} ${resto.slice(0, corte)}-${resto.slice(corte)}`
      : `+55 ${d.slice(0, 2)} ${resto}`;
  };
  if (telefone) {
    telefone.addEventListener('input', () => {
      const f = formatarTelefone(telefone.value);
      if (f !== telefone.value) telefone.value = f;
    });
    // vazio: mostra o exemplo (placeholder); ao focar entra o +55 fixo
    telefone.addEventListener('blur', () => {
      if (telefone.value.replace(/\D/g, '') === '55') telefone.value = '';
    });
    telefone.addEventListener('focus', () => {
      if (!telefone.value) telefone.value = '+55 ';
      const fim = telefone.value.length;
      requestAnimationFrame(() => telefone.setSelectionRange(fim, fim));
    });
  }

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
    if (dados.telefone) dados.telefone = String(dados.telefone).replace(/\D/g, ''); // só dígitos
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
        return null;
      }
      return corpo;
    } catch {
      definirErro('Sem conexão com o servidor.');
      return null;
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
    const resposta = await enviar(form.dataset.api);
    if (botao) botao.disabled = false;
    if (!resposta) return;

    // Conta criada: exibe o código de recuperação (uma única vez) antes de ir ao login
    const card = form.closest('.cadastro-card');
    if (resposta.codigo_recuperacao && card && window.hk) {
      card.replaceChildren(window.hk.painelCodigoRecuperacao({
        titulo: 'CONTA CRIADA!',
        codigo: resposta.codigo_recuperacao,
        textoBotao: 'Continuar para o login',
        destino: '/login?cadastro=ok',
      }));
    } else {
      location.href = '/login?cadastro=ok';
    }
  });

  mostrar(0);
})();
