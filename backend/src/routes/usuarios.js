/*
  Sistema de Escalas - Usuarios Routes
  Versão: 1.0.2
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

// GET /usuarios/me - Dados do usuário logado
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { id } = req.user;

    const result = await db.query(
      `SELECT u.id, u.nome, u.email, u.role, un.sigla as unidade_sigla
       FROM usuarios u
       LEFT JOIN unidades un ON u.unidade_id = un.id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /usuarios/me - Atualiza dados do usuário logado
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { id } = req.user;
    const { nome, email, senhaAtual, senhaNova } = req.body;

    // Busca usuário atual
    const userResult = await db.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const usuario = userResult.rows[0];

    // Se está alterando senha, verifica a atual
    if (senhaNova) {
      if (!senhaAtual) {
        return res.status(400).json({ error: 'Senha atual é obrigatória' });
      }
      const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
      if (!senhaValida) {
        return res.status(400).json({ error: 'Senha atual incorreta' });
      }
    }

    // Monta query de update
    let query, params;
    if (senhaNova) {
      const senhaHash = await bcrypt.hash(senhaNova, 10);
      query = `UPDATE usuarios SET nome = $1, email = $2, senha = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, nome, email`;
      params = [nome || usuario.nome, (email || usuario.email).toLowerCase(), senhaHash, id];
    } else {
      query = `UPDATE usuarios SET nome = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, nome, email`;
      params = [nome || usuario.nome, (email || usuario.email).toLowerCase(), id];
    }

    const result = await db.query(query, params);
    res.json({ message: 'Dados atualizados', usuario: result.rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /usuarios/:id - Admin atualiza dados de qualquer usuário
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, role, unidade_id, ativo } = req.body;

    const result = await db.query(
      `UPDATE usuarios 
       SET nome = $1, email = $2, role = $3, unidade_id = $4, ativo = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, nome, email, role, unidade_id, ativo`,
      [nome, email.toLowerCase(), role, unidade_id || null, ativo, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ message: 'Usuário atualizado', usuario: result.rows[0] });
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;