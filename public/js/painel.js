(async () => {
  const resp = await fetch('/api/me');
  if (!resp.ok) return (location.href = '/login');
  const { usuario } = await resp.json();
  const org = usuario.tipo === 'organizador';
  document.getElementById('perfil').textContent = org ? 'PAINEL DO ORGANIZADOR' : 'PAINEL DO PARTICIPANTE';
  document.getElementById('saudacao').textContent = `Olá, ${usuario.nome}!`;
  const info = document.getElementById('info');
  const linha = (rot, val) => {
    const p = document.createElement('p');
    p.append(`${rot}: `);
    const b = document.createElement('b'); b.textContent = val; p.append(b);
    info.append(p);
  };
  linha('E-mail', usuario.email);
  if (org) linha('Instituição', usuario.instituicao);
  document.getElementById('sair').addEventListener('click', () => window.hkSair());
})();
