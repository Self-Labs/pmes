/*
  Sistema de Escalas - Auth Routes
  Versão: 1.2 - Security Update
*/

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { enviarEmailNovoUsuario } = require('../config/email');

const router = express.Router();

// Validação de senha forte
function validarSenhaForte(senha) {
  if (!senha || senha.length < 8) return 'Senha deve ter no mínimo 8 caracteres';
  if (!/[A-Z]/.test(senha)) return 'Senha deve ter pelo menos uma letra maiúscula';
  if (!/[a-z]/.test(senha)) return 'Senha deve ter pelo menos uma letra minúscula';
  if (!/[0-9]/.test(senha)) return 'Senha deve ter pelo menos um número';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha)) return 'Senha deve ter pelo menos um caractere especial';
  return null;
}

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha obrigatórios' });
    }

    const result = await db.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const usuario = result.rows[0];

    if (!usuario.ativo) {
      return res.status(401).json({ error: 'Usuário aguardando aprovação' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { 
        id: usuario.id, 
        email: usuario.email, 
        role: usuario.role,
        unidade_id: usuario.unidade_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Define token em cookie HttpOnly (mais seguro que localStorage)
    res.cookie('pmes_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    });

    res.json({
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        unidade_id: usuario.unidade_id
      }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /auth/cadastro
router.post('/cadastro', async (req, res) => {
  try {
    const { nome, email, senha, unidade_id } = req.body;

    if (!nome || !email || !senha || !unidade_id) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Validação de senha forte
    const erroSenha = validarSenhaForte(senha);
    if (erroSenha) {
      return res.status(400).json({ error: erroSenha });
    }

    const existe = await db.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const result = await db.query(
      `INSERT INTO usuarios (nome, email, senha, unidade_id, role, ativo)
       VALUES ($1, $2, $3, $4, 'editor', false)
       RETURNING id, nome, email, role, unidade_id, ativo`,
      [nome, email.toLowerCase(), senhaHash, unidade_id]
    );

    const novoUsuario = result.rows[0];

    // Busca hierarquia completa da unidade para o email
    const unidadesResult = await db.query('SELECT id, sigla, parent_id FROM unidades');
    const unidades = unidadesResult.rows;
    const mapa = new Map(unidades.map(u => [u.id, u]));

    const getCaminho = (id) => {
      const u = mapa.get(id);
      if (!u) return [];
      if (!u.parent_id) return [u.sigla];
      return [...getCaminho(u.parent_id), u.sigla];
    };

    const caminho = getCaminho(unidade_id);
    const unidadeSigla = caminho.length > 0 ? caminho.join(' / ') : null;

    // Envia email para o admin
    enviarEmailNovoUsuario(novoUsuario, unidadeSigla);

    res.status(201).json({
      message: 'Cadastro realizado. Aguarde aprovação do administrador.',
      usuario: novoUsuario
    });
  } catch (err) {
    console.error('Erro no cadastro:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /auth/esqueci-senha
router.post('/esqueci-senha', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email obrigatório' });
    }

    const result = await db.query(
      'SELECT id, nome FROM usuarios WHERE email = $1',
      [email.toLowerCase()]
    );

    // Sempre retorna sucesso (segurança - não revelar se email existe)
    if (result.rows.length === 0) {
      return res.json({ message: 'Se o email existir, você receberá instruções de recuperação.' });
    }

    const usuario = result.rows[0];

    // Gera token de 64 caracteres
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hora

    // Salva token no banco
    await db.query(
      'UPDATE usuarios SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [token, expires, usuario.id]
    );

    // Envia email
    const { enviarEmailRecuperacaoSenha } = require('../config/email');
    await enviarEmailRecuperacaoSenha(email, usuario.nome, token);

    res.json({ message: 'Se o email existir, você receberá instruções de recuperação.' });
  } catch (err) {
    console.error('Erro ao solicitar recuperação:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /auth/resetar-senha
router.post('/resetar-senha', async (req, res) => {
  try {
    const { token, senha } = req.body;

    if (!token || !senha) {
      return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
    }

    // Validação de senha forte
    const erroSenha = validarSenhaForte(senha);
    if (erroSenha) {
      return res.status(400).json({ error: erroSenha });
    }

    // Busca usuário e INVALIDA token atomicamente (previne uso concorrente)
    const result = await db.query(
      `UPDATE usuarios 
       SET reset_token = NULL, reset_token_expires = NULL 
       WHERE reset_token = $1 AND reset_token_expires > NOW()
       RETURNING id`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    const usuario = result.rows[0];
    const senhaHash = await bcrypt.hash(senha, 10);

    // Atualiza senha (token já foi limpo acima)
    await db.query(
      'UPDATE usuarios SET senha = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [senhaHash, usuario.id]
    );

    res.json({ message: 'Senha alterada com sucesso!' });
  } catch (err) {
    console.error('Erro ao resetar senha:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /auth/logout - Limpa cookie de autenticação
router.post('/logout', (req, res) => {
  res.clearCookie('pmes_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ message: 'Logout realizado com sucesso' });
});

module.exports = router;