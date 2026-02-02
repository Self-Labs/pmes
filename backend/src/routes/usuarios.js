/*
  Sistema de Escalas - Usuarios Routes
  Versão: 1.8 - Architecture Refactor
*/

const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const usuarioController = require('../controllers/UsuarioController');

const router = express.Router();

// Rotas do Usuário Logado (devem vir antes das rotas parametrizadas :id)
router.get('/me', authMiddleware, usuarioController.buscarMe);
router.put('/me', authMiddleware, usuarioController.atualizarMe);

// Rotas de Admin
router.get('/', authMiddleware, adminMiddleware, usuarioController.listar);
router.get('/pendentes', authMiddleware, adminMiddleware, usuarioController.listarPendentes);
router.post('/', authMiddleware, adminMiddleware, usuarioController.criar);

// Rotas Parametrizadas (Admin)
router.put('/:id', authMiddleware, adminMiddleware, usuarioController.atualizar);
router.delete('/:id', authMiddleware, adminMiddleware, usuarioController.remover);
router.patch('/:id/aprovar', authMiddleware, adminMiddleware, usuarioController.aprovar);
router.patch('/:id/role', authMiddleware, adminMiddleware, usuarioController.alterarRole);

module.exports = router;