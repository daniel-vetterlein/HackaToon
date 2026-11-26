// /painel só encaminha cada perfil para a sua área
(async () => {
  const resp = await fetch('/api/me');
  if (!resp.ok) return (location.href = '/login');
  const { usuario } = await resp.json();
  location.href = usuario.tipo === 'organizador' ? '/organizador' : '/participante';
})();
