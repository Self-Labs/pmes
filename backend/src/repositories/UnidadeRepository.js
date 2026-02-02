/*
  Sistema de Escalas - UnidadeRepository
  Versão: 1.0 - Architecture Refactor
*/

const db = require('../config/db');

class UnidadeRepository {
  async findAll({ ativo = null } = {}) {
    let query = 'SELECT id, parent_id, sigla, tipo, ativo FROM unidades';
    const params = [];

    if (ativo !== null) {
      query += ' WHERE ativo = $1';
      params.push(ativo);
    }

    query += ' ORDER BY sigla';

    const result = await db.query(query, params);
    return result.rows;
  }

  async findAllForTree() {
    // Ordenação específica para árvore
    const result = await db.query(`
      SELECT id, parent_id, sigla, tipo, ativo
      FROM unidades
      WHERE ativo = true
      ORDER BY tipo, sigla
    `);
    return result.rows;
  }

  async create({ parent_id, sigla, tipo }) {
    const result = await db.query(
      `INSERT INTO unidades (parent_id, sigla, tipo)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [parent_id || null, sigla, tipo]
    );
    return result.rows[0];
  }

  async update(id, { sigla, tipo, parent_id, ativo }) {
    const result = await db.query(
      `UPDATE unidades 
       SET sigla = $1, tipo = $2, parent_id = $3, ativo = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [sigla, tipo, parent_id || null, ativo, id]
    );
    return result.rows[0];
  }

  async delete(id) {
    const result = await db.query(
      'DELETE FROM unidades WHERE id = $1 RETURNING id, sigla',
      [id]
    );
    return result.rows[0];
  }
}

module.exports = new UnidadeRepository();
