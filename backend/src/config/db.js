/*
  Sistema de Escalas - Database Config
  Versão: 1.0.0
*/

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};