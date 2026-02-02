/*
  Sistema de Escalas - EscalaController
  Versão: 1.0 - Architecture Refactor
*/

const escalaService = require('../services/EscalaService');

class EscalaController {
  // Factory para GET
  buscar(tipo) {
    return async (req, res) => {
      try {
        const escala = await escalaService.buscar(tipo, req.user, req.query.unidade_id);
        res.json(escala);
      } catch (err) {
        if (err.message === 'Permissão negada') {
          return res.status(403).json({ error: err.message });
        }
        if (err.message === 'Unidade não identificada') {
          return res.status(400).json({ error: err.message });
        }
        console.error(`Erro ao buscar escala ${tipo}:`, err);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    };
  }

  // Factory para POST
  salvar(tipo) {
    return async (req, res) => {
      try {
        const escala = await escalaService.salvar(tipo, req.user, req.body);
        res.json(escala);
      } catch (err) {
        if (err.message === 'Permissão negada') {
          return res.status(403).json({ error: err.message });
        }
        if (err.message === 'Unidade não identificada') {
          return res.status(400).json({ error: err.message });
        }
        console.error(`Erro ao salvar escala ${tipo}:`, err);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    };
  }
}

module.exports = new EscalaController();
