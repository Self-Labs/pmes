/*
  Sistema de Escalas - Unidades Routes
  Versão: 1.5 - Architecture Refactor
*/

const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const unidadeController = require('../controllers/UnidadeController');

const router = express.Router();

// Public
router.get('/', unidadeController.listar);
router.get('/arvore', unidadeController.listarArvore);

// Admin Protected
router.get('/todas', authMiddleware, adminMiddleware, unidadeController.listarTodas);
router.post('/', authMiddleware, adminMiddleware, unidadeController.criar);
router.put('/:id', authMiddleware, adminMiddleware, unidadeController.atualizar);
router.delete('/:id', authMiddleware, adminMiddleware, unidadeController.remover);

module.exports = router;