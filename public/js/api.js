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
};
