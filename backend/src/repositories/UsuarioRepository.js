/*
  Sistema de Escalas - UsuarioRepository
  Versão: 1.0 - Architecture Refactor
*/

const db = require('../config/db');
const bcrypt = require('bcryptjs');

class UsuarioRepository {
  async findAll() {
    const result = await db.query(`
      SELECT u.id, u.nome, u.email, u.role, u.ativo, u.created_at,
             u.unidade_id, un.sigla as unidade_sigla
      FROM usuarios u
      LEFT JOIN unidades un ON u.unidade_id = un.id
      ORDER BY u.created_at DESC
    `);
    return result.rows;
  }

  async findPendentes() {
    const result = await db.query(`
      SELECT u.id, u.nome, u.email, u.created_at,
             un.sigla as unidade_sigla
      FROM usuarios u
      LEFT JOIN unidades un ON u.unidade_id = un.id
      WHERE u.ativo = false
      ORDER BY u.created_at ASC
    `);
    return result.rows;
  }

  async findById(id) {
    const result = await db.query(
      `SELECT u.id, u.nome, u.email, u.role, u.ativo, u.unidade_id, u.senha, un.sigla as unidade_sigla
       FROM usuarios u
       LEFT JOIN unidades un ON u.unidade_id = un.id
       WHERE u.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  async findByEmail(email) {
    const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    return result.rows[0];
  }

  async create({ nome, email, senha, unidade_id, role, ativo }) {
    const result = await db.query(
      `INSERT INTO usuarios (nome, email, senha, unidade_id, role, ativo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nome, email, role, ativo, unidade_id`,
      [nome, email, senha, unidade_id || null, role || 'editor', ativo !== undefined ? ativo : true]
    );
    return result.rows[0];
  }

  async update(id, dados) {
    const campos = [];
    const valores = [];
    let i = 1;

    for (const [key, value] of Object.entries(dados)) {
      if (value !== undefined) {
        campos.push(`${key} = $${i}`);
        valores.push(value);
        i++;
      }
    }

    if (campos.length === 0) return null;

    valores.push(id);
    const query = `
      UPDATE usuarios 
      SET ${campos.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${i}
      RETURNING id, nome, email, role, unidade_id, ativo
    `;

    const result = await db.query(query, valores);
    return result.rows[0];
  }

  async findByResetToken(token) {
    // Atomic update/select to prevents race conditions
    const result = await db.query(
      `UPDATE usuarios 
       SET reset_token = NULL, reset_token_expires = NULL 
       WHERE reset_token = $1 AND reset_token_expires > NOW()
       RETURNING id, nome, email, role, unidade_id`,
      [token]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async updateResetToken(id, token, expires) {
    const result = await db.query(
      'UPDATE usuarios SET reset_token = $1, reset_token_expires = $2 WHERE id = $3 RETURNING id',
      [token, expires, id]
    );
    return result.rows[0];
  }

  async updatePassword(id, senhaHash) {
    const result = await db.query(
      'UPDATE usuarios SET senha = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
      [senhaHash, id]
    );
    return result.rows[0];
  }

  async delete(id) {
    const result = await db.query(
      'DELETE FROM usuarios WHERE id = $1 RETURNING id, nome',
      [id]
    );
    return result.rows[0];
  }
}

module.exports = new UsuarioRepository();
