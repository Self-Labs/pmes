/*
  Sistema de Escalas - UsuarioController
  Versão: 1.0 - Architecture Refactor
*/

const usuarioService = require('../services/UsuarioService');

class UsuarioController {
  async listar(req, res) {
    try {
      const usuarios = await usuarioService.listar();
      res.json(usuarios);
    } catch (err) {
      console.error('Erro ao listar usuários:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async listarPendentes(req, res) {
    try {
      const pendentes = await usuarioService.listarPendentes();
      res.json(pendentes);
    } catch (err) {
      console.error('Erro ao listar pendentes:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async buscarMe(req, res) {
    try {
      const usuario = await usuarioService.buscarMeusDados(req.user.id);
      res.json(usuario);
    } catch (err) {
      if (err.message === 'Usuário não encontrado') {
        return res.status(404).json({ error: err.message });
      }
      console.error('Erro ao buscar usuário:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async criar(req, res) {
    try {
      const { nome, email, senha, unidade_id, role, ativo } = req.body;
      if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
      }

      const usuario = await usuarioService.criar({ nome, email, senha, unidade_id, role, ativo });
      res.status(201).json({ message: 'Usuário criado', usuario });
    } catch (err) {
      if (err.message === 'Email já cadastrado') {
        return res.status(400).json({ error: err.message });
      }
      console.error('Erro ao criar usuário:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async atualizarMe(req, res) {
    try {
      const usuario = await usuarioService.atualizarMeusDados(req.user.id, req.body);
      res.json({ message: 'Dados atualizados', usuario });
    } catch (err) {
      if (err.message === 'Senha atual incorreta' || err.message === 'Senha atual é obrigatória') {
        return res.status(400).json({ error: err.message });
      }
      console.error('Erro ao atualizar usuário:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const usuario = await usuarioService.atualizar(id, req.body);
      res.json({ message: 'Usuário atualizado', usuario });
    } catch (err) {
      if (err.message === 'Usuário não encontrado') {
        return res.status(404).json({ error: err.message });
      }
      console.error('Erro ao atualizar usuário:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async aprovar(req, res) {
    try {
      const { id } = req.params;
      const usuario = await usuarioService.aprovar(id);
      res.json({ message: 'Usuário aprovado', usuario });
    } catch (err) {
      console.error('Erro ao aprovar usuário:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async alterarRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const usuario = await usuarioService.alterarRole(id, role);
      res.json({ message: 'Role atualizada', usuario });
    } catch (err) {
      if (err.message === 'Role inválida') {
        return res.status(400).json({ error: err.message });
      }
      console.error('Erro ao alterar role:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async remover(req, res) {
    try {
      const { id } = req.params;
      const usuario = await usuarioService.remover(id);
      res.json({ message: 'Usuário removido', usuario });
    } catch (err) {
      if (err.message === 'Usuário não encontrado') {
        return res.status(404).json({ error: err.message });
      }
      console.error('Erro ao remover usuário:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

module.exports = new UsuarioController();
