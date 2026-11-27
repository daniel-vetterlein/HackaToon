// Telefone brasileiro guardado só com dígitos, incluindo o 55: 55 + DDD (2) + número (8 ou 9).
// Retorna null se inválido.
function normalizarTelefone(valor) {
  const d = String(valor ?? '').replace(/\D/g, '');
  return /^55\d{10,11}$/.test(d) ? d : null;
}

module.exports = { normalizarTelefone };
