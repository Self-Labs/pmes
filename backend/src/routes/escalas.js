/*
  Sistema de Escalas - Escalas Routes
  Versão: 1.0.1
*/

const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// =============================================
// ESCALAS MENSAL
// =============================================

// GET /escalas/mensal - Busca escala da unidade
router.get('/mensal', authMiddleware, async (req, res) => {
  try {
    // Se for Admin e passar ?unidade_id=X, usa esse ID. Senão, usa o do token.
    let targetUnidadeId = req.user.unidade_id;
    if (req.user.role === 'admin' && req.query.unidade_id) {
      targetUnidadeId = req.query.unidade_id;
    }

    // Se admin sem unidade tentar acessar sem especificar, retorna null (ou erro)
    if (!targetUnidadeId) return res.json(null);

    const result = await db.query(
      'SELECT * FROM escalas_mensal WHERE unidade_id = $1',
      [targetUnidadeId]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar escala mensal:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /escalas/mensal - Cria ou atualiza escala
router.post('/mensal', authMiddleware, async (req, res) => {
  try {
    // LÓGICA CORRIGIDA:
    // Se for Admin, aceita unidade_id do corpo. Se não, força do token.
    let targetUnidadeId = req.user.unidade_id;
    if (req.user.role === 'admin' && req.body.unidade_id) {
      targetUnidadeId = req.body.unidade_id;
    }

    if (!targetUnidadeId) {
      return res.status(400).json({ error: 'Operação falhou: Unidade não identificada.' });
    }

    const { config, militares, colunas, equipes, observacoes } = req.body;

    const result = await db.query(
      `INSERT INTO escalas_mensal (unidade_id, config, militares, colunas, equipes, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (unidade_id)
       DO UPDATE SET 
         config = $2, 
         militares = $3, 
         colunas = $4, 
         equipes = $5, 
         observacoes = $6,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [targetUnidadeId, // Usa o ID resolvido acima
       JSON.stringify(config || {}), 
       JSON.stringify(militares || []), 
       JSON.stringify(colunas || []), 
       JSON.stringify(equipes || {}), 
       JSON.stringify(observacoes || [])]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao salvar escala mensal:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// =============================================
// ESCALAS ISEO
// =============================================

// GET /escalas/iseo - Busca escala da unidade
router.get('/iseo', authMiddleware, async (req, res) => {
  try {
    let targetUnidadeId = req.user.unidade_id;
    if (req.user.role === 'admin' && req.query.unidade_id) {
      targetUnidadeId = req.query.unidade_id;
    }

    if (!targetUnidadeId) return res.json(null);

    const result = await db.query(
      'SELECT * FROM escalas_iseo WHERE unidade_id = $1',
      [targetUnidadeId]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar escala ISEO:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /escalas/iseo - Cria ou atualiza escala
router.post('/iseo', authMiddleware, async (req, res) => {
  try {
    // LÓGICA CORRIGIDA:
    let targetUnidadeId = req.user.unidade_id;
    if (req.user.role === 'admin' && req.body.unidade_id) {
      targetUnidadeId = req.body.unidade_id;
    }

    if (!targetUnidadeId) {
      return res.status(400).json({ error: 'Operação falhou: Unidade não identificada.' });
    }

    const { config, dados, militares, observacoes, setor } = req.body;

    const result = await db.query(
      `INSERT INTO escalas_iseo (unidade_id, config, dados, militares, observacoes, setor)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (unidade_id)
       DO UPDATE SET 
         config = $2, 
         dados = $3, 
         militares = $4, 
         observacoes = $5,
         setor = $6,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [targetUnidadeId,
       JSON.stringify(config || {}),
       JSON.stringify(dados || {}),
       JSON.stringify(militares || []),
       JSON.stringify(observacoes || []),
       setor || null]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao salvar escala ISEO:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;