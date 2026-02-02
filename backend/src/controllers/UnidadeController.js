/*
  Sistema de Escalas - UnidadeController
  Versão: 1.0 - Architecture Refactor
*/

const unidadeService = require('../services/UnidadeService');

class UnidadeController {
  async listar(req, res) {
    try {
      const unidades = await unidadeService.listar(true);
      res.json(unidades);
    } catch (err) {
      console.error('Erro ao listar unidades:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async listarTodas(req, res) {
    try {
      const unidades = await unidadeService.listarTodas();
      res.json(unidades);
    } catch (err) {
      console.error('Erro ao listar todas unidades:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async listarArvore(req, res) {
    try {
      const arvore = await unidadeService.listarArvore();
      res.json(arvore);
    } catch (err) {
      console.error('Erro ao listar árvore:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async criar(req, res) {
    try {
      const { sigla, tipo, parent_id } = req.body;

      if (!sigla || !tipo) {
        return res.status(400).json({ error: 'Sigla e tipo são obrigatórios' });
      }

      const unidade = await unidadeService.criar({ sigla, tipo, parent_id });
      res.status(201).json(unidade);
    } catch (err) {
      if (err.message === 'Tipo de unidade inválido') {
        return res.status(400).json({ error: err.message });
      }
      console.error('Erro ao criar unidade:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const unidade = await unidadeService.atualizar(id, req.body);
      res.json({ message: 'Unidade atualizada', unidade });
    } catch (err) {
      if (err.message === 'Unidade não encontrada') {
        return res.status(404).json({ error: err.message });
      }
      console.error('Erro ao atualizar unidade:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async remover(req, res) {
    try {
      const { id } = req.params;
      const unidade = await unidadeService.remover(id);
      res.json({ message: 'Unidade removida', unidade });
    } catch (err) {
      if (err.message === 'Unidade não encontrada') {
        return res.status(404).json({ error: err.message });
      }
      console.error('Erro ao remover unidade:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

module.exports = new UnidadeController();
