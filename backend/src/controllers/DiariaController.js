/*
  Sistema de Escalas - DiariaController
  Versão: 1.0 - Architecture Refactor
*/

const diariaService = require('../services/DiariaService');

class DiariaController {
  async buscar(req, res) {
    try {
      const escala = await diariaService.buscar(req.user, req.query.unidade_id);
      res.json(escala);
    } catch (err) {
      if (err.message === 'Sem permissão para esta unidade') {
        return res.status(403).json({ error: err.message });
      }
      if (err.message === 'unidade_id é obrigatório') {
        return res.status(400).json({ error: err.message });
      }
      console.error('Erro ao buscar escala diária:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async salvar(req, res) {
    try {
      const result = await diariaService.salvar(req.user, req.body);
      res.json({ success: true, ...result });
    } catch (err) {
      if (err.message === 'Sem permissão para esta unidade') {
        return res.status(403).json({ error: err.message });
      }
      console.error('Erro ao salvar escala diária:', err);
      res.status(500).json({ error: 'Erro ao salvar escala diária' });
    }
  }
}

module.exports = new DiariaController();
