const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function enviarEmailNovoUsuario(usuario, unidadeSigla) {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail || !process.env.SMTP_USER) {
    console.log('⚠️ Email não configurado, pulando notificação');
    return;
  }

  const html = `
    <h2>📋 Novo cadastro no Sistem de Escalas</h2>
    <p>Um novo usuário solicitou acesso ao sistema:</p>
    <table style="border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Nome:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${usuario.nome}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${usuario.email}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Unidade:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${unidadeSigla || 'Não informada'}</td></tr>
    </table>
    <p>Acesse o painel administrativo para aprovar ou rejeitar.</p>
    <p style="color: #666; font-size: 12px;">— Sistema de Escalas</p>
  `;

  try {
    await transporter.sendMail({
      from: `"Sistema de Escalas" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: '📋 Novo cadastro aguardando aprovação',
      html,
    });
    console.log('✅ Email de notificação enviado para', adminEmail);
  } catch (err) {
    console.error('❌ Erro ao enviar email:', err.message);
  }
}

module.exports = { enviarEmailNovoUsuario };