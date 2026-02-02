/*
  Sistema de Escalas - Escalas Diárias
  Versão: 1.8 - Architecture Refactor
*/

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const diariaController = require('../controllers/DiariaController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', diariaController.buscar);
router.post('/', diariaController.salvar);

module.exports = router;