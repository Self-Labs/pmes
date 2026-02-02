/*
  Sistema de Escalas - Auth Routes
  Versão: 1.4 - Architecture Refactor
*/

const express = require('express');
const authController = require('../controllers/AuthController');

const router = express.Router();

// Public Routes
router.post('/login', authController.login);
router.post('/cadastro', authController.cadastro);
router.post('/esqueci-senha', authController.esqueciSenha);
router.post('/resetar-senha', authController.resetarSenha);
router.post('/logout', authController.logout);

module.exports = router;