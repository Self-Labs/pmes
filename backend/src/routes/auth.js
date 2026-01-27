/*
  Sistema de Escalas - Auth Routes
  Versão: 1.0
*/

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { enviarEmailNovoUsuario } = require('../config/email');

const router = express.Router();

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

    res.json({
      token,
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

    // Busca sigla da unidade para o email
    const unidadeResult = await db.query('SELECT sigla FROM unidades WHERE id = $1', [unidade_id]);
    const unidadeSigla = unidadeResult.rows[0]?.sigla || null;

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

module.exports = router;