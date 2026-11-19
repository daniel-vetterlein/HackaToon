// Ponto de integração: envio do código de verificação.
// metodo:  'email' ou 'sms'
// destino: o e-mail, ou o telefone (só dígitos, com DDD, sem +55)
// codigo:  os 6 dígitos em texto
// Deve lançar um erro se o envio falhar.
async function enviarCodigo({ metodo, destino, codigo }) {
  // TODO: integrar com o serviço de e-mail/SMS
}

module.exports = { enviarCodigo };