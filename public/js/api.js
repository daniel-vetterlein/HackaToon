// Utilitários compartilhados pelas páginas logadas
window.hk = {
  async api(metodo, url, corpo) {
    const opts = { method: metodo, headers: { 'Content-Type': 'application/json' } };
    if (corpo !== undefined) opts.body = JSON.stringify(corpo);
    const resp = await fetch(url, opts);
    if (resp.status === 401) { location.href = '/login'; throw new Error('Sessão expirada'); }
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(dados.erro || 'Erro inesperado.');
    return dados;
  },
  // el('div', {class:'x', onclick: fn}, 'texto', outroNo) — sempre textContent, sem innerHTML
  el(tag, attrs = {}, ...filhos) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    n.append(...filhos.filter((f) => f != null && f !== false));
    return n;
  },
  data(iso) {
    if (!iso) return '';
    const [d, h] = iso.split('T');
    const [a, m, dia] = d.split('-');
    return `${dia}/${m}/${a} ${h}`;
  },
  // Copia texto e dá feedback no botão ("Copiado!")
  async copiar(texto, botao) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const t = document.createElement('textarea'); // fallback p/ contextos sem Clipboard API
      t.value = texto; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } finally { t.remove(); }
    }
    if (!botao) return;
    const original = botao.dataset.rotulo || (botao.dataset.rotulo = botao.textContent);
    botao.textContent = 'Copiado!';
    botao.classList.add('copiado');
    clearTimeout(botao._t);
    botao._t = setTimeout(() => { botao.textContent = original; botao.classList.remove('copiado'); }, 1600);
  },
  // Tela "guarde seu código de recuperação" (exibido uma única vez)
  painelCodigoRecuperacao({ titulo, codigo, textoBotao, destino }) {
    const { el } = window.hk;
    const check = el('input', { type: 'checkbox', id: 'anotei' });
    const continuar = el('button', { class: 'btn btn-primary comic-button', type: 'button', disabled: true,
      onclick: () => { location.href = destino; } }, textoBotao);
    check.addEventListener('change', () => { continuar.disabled = !check.checked; });
    return el('div', { class: 'painel-codigo' },
      el('h2', { class: 'login-titulo' }, titulo),
      el('p', { class: 'etapa-sub' }, 'Este código permite redefinir sua senha caso você a esqueça. Ele aparece somente agora e não poderá ser consultado depois — anote ou copie em um lugar seguro.'),
      el('div', { class: 'codigo-recuperacao' },
        el('code', { id: 'codigo-rec' }, codigo),
        el('button', { class: 'btn-copiar', type: 'button', 'data-copiar': 'codigo-rec' }, 'Copiar')),
      el('label', { class: 'confirma-codigo', for: 'anotei' }, check, 'Guardei meu código de recuperação'),
      el('div', { class: 'acoes' }, continuar));
  },
  fmtNota(n) {
    return n == null ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  },
  // Pódio (1º, 2º, 3º) + tabela completa a partir de `colocacoes` da API
  renderColocacoes(lista) {
    const { el, fmtNota } = window.hk;
    const avaliadas = lista.filter((c) => c.posicao != null);

    const degrau = (c) => el('div', { class: `degrau pos-${c.posicao}`, role: 'listitem' },
      el('span', { class: 'medalha', 'aria-label': `${c.posicao}º lugar` }, String(c.posicao)),
      el('strong', {}, c.equipe),
      el('small', {}, c.projeto || 'Sem projeto'),
      el('span', { class: 'media' }, fmtNota(c.media)));

    // ordem visual do pódio: 2º, 1º, 3º
    const top = avaliadas.slice(0, 3);
    const ordem = [top[1], top[0], top[2]].filter(Boolean);

    const linhas = lista.map((c) => el('tr', { class: c.posicao && c.posicao <= 3 ? 'top' : '' },
      el('td', { class: 'col-pos' }, c.posicao ? `${c.posicao}º` : '—'),
      el('td', {}, c.equipe),
      el('td', {}, c.projeto || '—'),
      el('td', {}, c.github && /^https?:\/\//i.test(c.github)
        ? el('a', { href: c.github, target: '_blank', rel: 'noopener noreferrer' }, 'GitHub ↗') : '—'),
      el('td', { class: 'col-media' }, fmtNota(c.media))));

    return el('div', { class: 'colocacoes' },
      ordem.length
        ? el('div', { class: 'podio', role: 'list' }, ...ordem.map(degrau))
        : el('p', { class: 'vazio' }, 'Nenhum projeto foi avaliado ainda.'),
      lista.length && el('div', { class: 'tabela-wrap' },
        el('table', { class: 'tabela' },
          el('thead', {}, el('tr', {}, ...['Posição', 'Equipe', 'Projeto', 'GitHub', 'Nota média'].map((h) => el('th', {}, h)))),
          el('tbody', {}, ...linhas))));
  },
};

// Qualquer botão com data-copiar="id-do-elemento" copia o texto desse elemento
document.addEventListener('click', (ev) => {
  const botao = ev.target.closest('[data-copiar]');
  if (!botao) return;
  const alvo = document.getElementById(botao.dataset.copiar);
  if (alvo) window.hk.copiar(alvo.textContent.trim(), botao);
});
