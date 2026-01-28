/*
  Sistema de Escalas - Email Config
  Versão: 1.2
*/

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
    <h2>📋 Novo cadastro no Sistema de Escalas</h2>
    <p>Um novo usuário solicitou acesso ao sistema:</p>
    <table style="border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Nome:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${usuario.nome}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${usuario.email}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Unidade:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${unidadeSigla || 'Não informada'}</td></tr>
    </table>
    <p>Acesse o <a href="https://pmes.selflabs.org/admin" style="color: #007bff; text-decoration: underline;">painel administrativo</a> para aprovar ou rejeitar.</p>
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

async function enviarEmailRecuperacaoSenha(email, nome, token) {
  if (!process.env.SMTP_USER) {
    console.log('⚠️ Email não configurado, pulando recuperação');
    return;
  }

  const baseUrl = process.env.APP_URL || 'https://pmes.selflabs.org';
  const resetLink = `${baseUrl}/resetar-senha?token=${token}`;

  const html = `
    <h2>🔑 Recuperação de Senha</h2>
    <p>Olá <strong>${nome}</strong>,</p>
    <p>Recebemos uma solicitação para redefinir sua senha no Sistema de Escalas.</p>
    <p>Clique no botão abaixo para criar uma nova senha:</p>
    <p style="margin: 24px 0;">
      <a href="${resetLink}" style="background: #1a365d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Redefinir Senha</a>
    </p>
    <p style="color: #666; font-size: 13px;">Ou copie e cole este link no navegador:</p>
    <p style="color: #666; font-size: 12px; word-break: break-all;">${resetLink}</p>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;">
    <p style="color: #999; font-size: 12px;">⚠️ Este link expira em <strong>1 hora</strong>.</p>
    <p style="color: #999; font-size: 12px;">Se você não solicitou a recuperação, ignore este email.</p>
    <p style="color: #666; font-size: 12px;">— Sistema de Escalas</p>
  `;

  try {
    await transporter.sendMail({
      from: `"Sistema de Escalas" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '🔑 Recuperação de senha - Sistema de Escalas',
      html,
    });
    console.log('✅ Email de recuperação enviado para', email);
  } catch (err) {
    console.error('❌ Erro ao enviar email de recuperação:', err.message);
  }
}

module.exports = { enviarEmailNovoUsuario, enviarEmailRecuperacaoSenha };