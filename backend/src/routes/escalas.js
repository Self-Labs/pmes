/*
  Sistema de Escalas - Escalas Routes
  Versão: 1.6 - Architecture Refactor
*/

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const escalaController = require('../controllers/EscalaController');

const router = express.Router();

// Mensal
router.get('/mensal', authMiddleware, escalaController.buscar('mensal'));
router.post('/mensal', authMiddleware, escalaController.salvar('mensal'));

// ISEO
router.get('/iseo', authMiddleware, escalaController.buscar('iseo'));
router.post('/iseo', authMiddleware, escalaController.salvar('iseo'));

module.exports = router;