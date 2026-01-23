const express = require('express');
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /unidades - Lista todas (público para cadastro)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, parent_id, nome, sigla, tipo, ativo
      FROM unidades
      WHERE ativo = true
      ORDER BY sigla
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar unidades:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /unidades/arvore - Lista hierárquica
router.get('/arvore', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, parent_id, nome, sigla, tipo, ativo
      FROM unidades
      WHERE ativo = true
      ORDER BY tipo, sigla
    `);

    // Monta árvore
    const unidades = result.rows;
    const map = {};
    const raiz = [];

    unidades.forEach(u => {
      map[u.id] = { ...u, filhos: [] };
    });

    unidades.forEach(u => {
      if (u.parent_id && map[u.parent_id]) {
        map[u.parent_id].filhos.push(map[u.id]);
      } else if (!u.parent_id) {
        raiz.push(map[u.id]);
      }
    });

    res.json(raiz);
  } catch (err) {
    console.error('Erro ao listar árvore:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /unidades - Cria unidade (admin)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { parent_id, nome, sigla, tipo } = req.body;

    if (!nome || !sigla || !tipo) {
      return res.status(400).json({ error: 'Nome, sigla e tipo são obrigatórios' });
    }

    const tipos = ['CPOR', 'CPOE', 'BPM', 'CIA_IND', 'CIA', 'COPOM', 'PELOTAO', 'OUTRO'];
    if (!tipos.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido' });
    }

    const result = await db.query(
      `INSERT INTO unidades (parent_id, nome, sigla, tipo)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [parent_id || null, nome, sigla, tipo]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar unidade:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /unidades/:id - Atualiza unidade (admin)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { parent_id, nome, sigla, tipo, ativo } = req.body;

    const result = await db.query(
      `UPDATE unidades 
       SET parent_id = $1, nome = $2, sigla = $3, tipo = $4, ativo = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [parent_id || null, nome, sigla, tipo, ativo, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unidade não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar unidade:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /unidades/:id - Remove unidade (admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM unidades WHERE id = $1 RETURNING id, sigla',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unidade não encontrada' });
    }

    res.json({ message: 'Unidade removida', unidade: result.rows[0] });
  } catch (err) {
    console.error('Erro ao remover unidade:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;