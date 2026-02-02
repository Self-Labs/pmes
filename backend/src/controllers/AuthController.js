/*
  Sistema de Escalas - AuthController
  Versão: 1.0 - Architecture Refactor
*/

const authService = require('../services/AuthService');

class AuthController {
  async login(req, res) {
    try {
      const { email, senha } = req.body;
      if (!email || !senha) {
        return res.status(400).json({ error: 'Email e senha obrigatórios' });
      }

      const { token, usuario } = await authService.login(email, senha);

      res.cookie('pmes_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      // Returns user data without exposing the token in the body (it's in the cookie)
      const userResponse = { ...usuario };
      delete userResponse.senha;
      
      res.json({ usuario: userResponse });
    } catch (err) {
      if (err.message === 'Credenciais inválidas' || err.message === 'Usuário aguardando aprovação') {
        return res.status(401).json({ error: err.message });
      }
      console.error('Erro no login:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async cadastro(req, res) {
    try {
      const { nome, email, senha, unidade_id } = req.body;
      if (!nome || !email || !senha || !unidade_id) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
      }

      const usuario = await authService.cadastro(req.body);
      
      res.status(201).json({
        message: 'Cadastro realizado. Aguarde aprovação do administrador.',
        usuario
      });
    } catch (err) {
      if (err.message === 'Email já cadastrado' || err.message.startsWith('Senha')) {
        return res.status(400).json({ error: err.message });
      }
      console.error('Erro no cadastro:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async esqueciSenha(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email obrigatório' });
      }

      await authService.esqueciSenha(email);
      res.json({ message: 'Se o email existir, você receberá instruções de recuperação.' });
    } catch (err) {
      console.error('Erro ao solicitar recuperação:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async resetarSenha(req, res) {
    try {
      const { token, senha } = req.body;
      if (!token || !senha) {
        return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
      }

      await authService.resetarSenha(token, senha);
      res.json({ message: 'Senha alterada com sucesso!' });
    } catch (err) {
      if (err.message === 'Token inválido ou expirado' || err.message.startsWith('Senha')) {
        return res.status(400).json({ error: err.message });
      }
      console.error('Erro ao resetar senha:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async logout(req, res) {
    res.clearCookie('pmes_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    res.json({ message: 'Logout realizado com sucesso' });
  }
}

module.exports = new AuthController();
