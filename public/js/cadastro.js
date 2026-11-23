(() => {
  // Altere para true quando quiser reativar a etapa de verificação em duas etapas (2FA)
  const EXIGIR_VERIFICACAO = false;

  const form = document.querySelector('[data-cadastro]');
  if (!form) return;

  const todasEtapas = [...form.querySelectorAll('[data-etapa]')];
  const todosPassos = [...document.querySelectorAll('[data-passo]')];

  // Identifica qual etapa possui o campo de código para ocultá-la quando o 2FA estiver desligado
  const indiceVerificacao = todasEtapas.findIndex((etapa) =>
    etapa.querySelector('input[name="codigo"]')
  );

  const etapas = todasEtapas.filter((etapa, idx) => {
    const ocultar = !EXIGIR_VERIFICACAO && idx === indiceVerificacao;
    if (ocultar) {
      etapa.hidden = true;
      etapa.querySelectorAll('input').forEach((inp) => (inp.disabled = true));
    }
    return !ocultar;
  });

  const passos = todosPassos.filter((passo, idx) => {
    const ocultar = !EXIGIR_VERIFICACAO && idx === indiceVerificacao;
    if (ocultar) passo.hidden = true;
    return !ocultar;
  });

  // Oculta também a seleção de E-mail/SMS na etapa 1 quando o 2FA estiver desativado
  if (!EXIGIR_VERIFICACAO && indiceVerificacao !== -1) {
    const blocoMetodo = form.querySelector('input[name="metodo"]')?.closest('fieldset');
    if (blocoMetodo) blocoMetodo.hidden = true;
    const nota = form.querySelector('.nota');
    if (nota) nota.hidden = true;
  }

  const contador = document.getElementById('contador');
  const erro = form.querySelector('.form-erro');
  let atual = 0;

  function definirErro(mensagem = '') {
    if (erro) erro.textContent = mensagem;
  }

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

    // Normaliza o telefone (só dígitos, sem +55) e preenche 'destino' para compatibilidade com envio.js
    if (dados.telefone) {
      dados.telefone = String(dados.telefone).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    }
    dados.metodo = dados.metodo === 'sms' ? 'sms' : 'email';
    dados.destino = dados.metodo === 'sms' ? dados.telefone : (dados.email || '').trim().toLowerCase();

    return dados;
  }

  async function enviar(url) {
    if (!url) {
      definirErro('Rota de envio não configurada no formulário.');
      return false;
    }

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

  form.addEventListener('click', async (ev) => {
    const botao = ev.target.closest('[data-acao]');
    if (!botao) return;

    if (botao.dataset.acao === 'voltar') return mostrar(atual - 1);
    if (botao.dataset.acao !== 'avancar' || !etapaValida()) return;

    if (EXIGIR_VERIFICACAO && botao.dataset.api) { // ex.: enviar o código antes de avançar
      botao.disabled = true;
      definirErro('');
      const ok = await enviar(botao.dataset.api);
      botao.disabled = false;
      if (!ok) return;
    }

    // Se já estiver na última etapa visível (ex.: organizador com 2FA desligado), conclui o cadastro
    if (atual === etapas.length - 1) {
      form.requestSubmit();
      return;
    }

    mostrar(atual + 1);
  });

  // o texto do botão acompanha o método de verificação escolhido
  const rotulo = form.querySelector('[data-rotulo-metodo]');
  if (rotulo) {
    if (!EXIGIR_VERIFICACAO) {
      rotulo.textContent = 'Concluir cadastro';
    } else {
      form.querySelectorAll('input[name="metodo"]').forEach((r) =>
        r.addEventListener('change', () => {
          rotulo.textContent = r.value === 'sms' ? 'Enviar código por SMS' : 'Enviar código por e-mail';
        })
      );
    }
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (atual < etapas.length - 1) {         // Enter nos passos iniciais = clicar em "avançar"
      etapas[atual].querySelector('[data-acao="avancar"]')?.click();
      return;
    }
    if (!etapaValida()) return;

    const botao = ev.submitter || form.querySelector('[data-acao="avancar"]') || form.querySelector('[type="submit"]');
    if (botao) botao.disabled = true;
    const ok = await enviar(form.dataset.api);
    if (botao) botao.disabled = false;

    if (ok) location.href = '/login';
  });

  mostrar(0);
})();