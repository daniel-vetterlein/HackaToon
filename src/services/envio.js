const nodemailer = require('nodemailer');

// Configura o transporte SMTP a partir das variáveis de ambiente
function criarTransporterEmail() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true', // true para 465, false para 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function enviarPorEmail(destino, codigo) {
  const transporter = criarTransporterEmail();

  // Fallback para desenvolvimento local caso o SMTP não esteja configurado
  if (!transporter) {
    console.log(`[DEV - E-MAIL] Para: ${destino} | Código de verificação: ${codigo}`);
    return;
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || `"HackaToon" <${process.env.SMTP_USER}>`,
    to: destino,
    subject: 'Seu código de verificação - HackaToon',
    text: `Seu código de verificação é: ${codigo}. Ele expira em 10 minutos.`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.5;">
        <h2>Confirme seu cadastro no HackaToon</h2>
        <p>Use o código de 6 dígitos abaixo para validar sua conta:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${codigo}</p>
        <p>Esse código expira em 10 minutos.</p>
      </div>
    `,
  });

  if (!info.messageId) {
    throw new Error('Falha ao confirmar o envio do e-mail pelo servidor SMTP.');
  }
}

async function enviarPorSms(destino, codigo) {
  // Fallback para desenvolvimento local caso a API de SMS não esteja configurada
  if (!process.env.SMS_API_URL || !process.env.SMS_API_TOKEN) {
    console.log(`[DEV - SMS] Para: +55${destino} | Código de verificação: ${codigo}`);
    return;
  }

  // Exemplo genérico via REST (compatível com gateways HTTP como Zenvia, Comtele, etc.)
  const resposta = await fetch(process.env.SMS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SMS_API_TOKEN}`,
    },
    body: JSON.stringify({
      to: `55${destino}`,
      message: `HackaToon: seu codigo de verificacao e ${codigo}.`,
    }),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text();
    throw new Error(`Erro no provedor de SMS (${resposta.status}): ${detalhe}`);
  }
}

// Ponto de integração: envio do código de verificação.
// metodo:  'email' ou 'sms'
// destino: o e-mail, ou o telefone (só dígitos, com DDD, sem +55)
// codigo:  os 6 dígitos em texto
// Deve lançar um erro se o envio falhar.
async function enviarCodigo({ metodo, destino, codigo }) {
  if (!destino || !codigo) {
    throw new Error('Destino e código são obrigatórios para o envio.');
  }

  if (metodo === 'email') {
    await enviarPorEmail(destino, codigo);
    return;
  }

  if (metodo === 'sms') {
    const telefoneLimpo = String(destino).replace(/\D/g, '');
    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
      throw new Error('Telefone inválido. Informe DDD + número (10 ou 11 dígitos).');
    }
    await enviarPorSms(telefoneLimpo, codigo);
    return;
  }

  throw new Error(`Método de envio não suportado: ${metodo}`);
}

module.exports = { enviarCodigo };