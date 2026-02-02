/*
  Sistema de Escalas - EscalaRepository
  Versão: 1.0 - Architecture Refactor
*/

const db = require('../config/db');

const ESCALA_CONFIGS = {
  mensal: {
    table: 'escalas_mensal',
    columns: ['config', 'militares', 'colunas', 'equipes', 'observacoes'],
    jsonColumns: ['config', 'militares', 'colunas', 'equipes', 'observacoes'],
    defaults: { config: {}, militares: [], colunas: [], equipes: {}, observacoes: [] }
  },
  iseo: {
    table: 'escalas_iseo',
    columns: ['config', 'dados', 'militares', 'observacoes', 'setor'],
    jsonColumns: ['config', 'dados', 'militares', 'observacoes'], 
    defaults: { config: {}, dados: {}, militares: [], observacoes: [], setor: null }
  }
};

class EscalaRepository {
  async findByUnidadeId(tipo, unidadeId) {
    const config = ESCALA_CONFIGS[tipo];
    if (!config) throw new Error(`Tipo de escala desconhecido: ${tipo}`);

    const result = await db.query(
      `SELECT * FROM ${config.table} WHERE unidade_id = $1`,
      [unidadeId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async upsert(tipo, unidadeId, data) {
    const config = ESCALA_CONFIGS[tipo];
    if (!config) throw new Error(`Tipo de escala desconhecido: ${tipo}`);

    const { table, columns, jsonColumns, defaults } = config;

    // Prepara valores
    const values = columns.map(col => {
      const val = data[col] !== undefined ? data[col] : defaults[col];
      return jsonColumns.includes(col) ? JSON.stringify(val) : val;
    });

    // Query dinâmica
    const placeholders = columns.map((_, i) => `$${i + 2}`).join(', ');
    const updateSet = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');

    const query = `
      INSERT INTO ${table} (unidade_id, ${columns.join(', ')})
      VALUES ($1, ${placeholders})
      ON CONFLICT (unidade_id)
      DO UPDATE SET ${updateSet}, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await db.query(query, [unidadeId, ...values]);
    return result.rows[0];
  }
}

module.exports = new EscalaRepository();
