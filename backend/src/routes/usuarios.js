/*
  Sistema de Escalas - Usuarios Routes
  Versão: 1.0.1
*/

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /usuarios - Lista usuários (admin)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.nome, u.email, u.role, u.ativo, u.created_at,
             un.sigla as unidade_sigla, un.nome as unidade_nome
      FROM usuarios u
      LEFT JOIN unidades un ON u.unidade_id = un.id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /usuarios/pendentes - Lista usuários pendentes (admin)
router.get('/pendentes', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.nome, u.email, u.created_at,
             un.sigla as unidade_sigla
      FROM usuarios u
      LEFT JOIN unidades un ON u.unidade_id = un.id
      WHERE u.ativo = false
      ORDER BY u.created_at ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar pendentes:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PATCH /usuarios/:id/aprovar - Aprova usuário (admin)
router.patch('/:id/aprovar', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE usuarios SET ativo = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING id, nome, email`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ message: 'Usuário aprovado', usuario: result.rows[0] });
  } catch (err) {
    console.error('Erro ao aprovar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PATCH /usuarios/:id/role - Altera role (admin)
router.patch('/:id/role', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'editor'].includes(role)) {
      return res.status(400).json({ error: 'Role inválida' });
    }

    const result = await db.query(
      `UPDATE usuarios SET role = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING id, nome, email, role`,
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ message: 'Role atualizada', usuario: result.rows[0] });
  } catch (err) {
    console.error('Erro ao alterar role:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /usuarios/:id - Remove usuário (admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM usuarios WHERE id = $1 RETURNING id, nome',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ message: 'Usuário removido', usuario: result.rows[0] });
  } catch (err) {
    console.error('Erro ao remover usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;