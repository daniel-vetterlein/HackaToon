// Normaliza para só dígitos (DDD + número, sem +55). Retorna null se inválido (10 ou 11 dígitos).
function normalizarTelefone(valor) {
  let d = String(valor ?? '').replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  return /^\d{10,11}$/.test(d) ? d : null;
}

module.exports = { normalizarTelefone };
