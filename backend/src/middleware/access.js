/*
  Sistema de Escalas - Access Control
  Versão: 1.0 - Security Update
  
  Middleware para validação de acesso hierárquico
*/

const db = require('../config/db');

/**
 * Verifica se usuário tem acesso à unidade (mesma ou descendente na hierarquia)
 * @param {string} userId - ID do usuário logado
 * @param {string} userUnidadeId - Unidade do usuário logado
 * @param {string} userRole - Role do usuário (admin/editor)
 * @param {string} unidadeAlvo - Unidade que se deseja acessar
 * @returns {boolean} - true se tem acesso
 */
async function verificarAcessoUnidade(userId, userUnidadeId, userRole, unidadeAlvo) {
  // Admin global (sem unidade vinculada) tem acesso total
  if (userRole === 'admin' && !userUnidadeId) return true;
  
  // Mesma unidade sempre tem acesso
  if (userUnidadeId === unidadeAlvo) return true;

  // Verificar se unidadeAlvo é descendente da unidade do usuário
  const result = await db.query(`
    WITH RECURSIVE hierarquia AS (
      SELECT id, parent_id FROM unidades WHERE id = $1
      UNION ALL
      SELECT u.id, u.parent_id FROM unidades u
      INNER JOIN hierarquia h ON u.parent_id = h.id
    )
    SELECT id FROM hierarquia WHERE id = $2
  `, [userUnidadeId, unidadeAlvo]);

  return result.rows.length > 0;
}

module.exports = { verificarAcessoUnidade };
