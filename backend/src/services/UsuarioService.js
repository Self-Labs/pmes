/*
  Sistema de Escalas - UsuarioService
  Versão: 1.0 - Architecture Refactor
*/

const usuarioRepository = require('../repositories/UsuarioRepository');
const bcrypt = require('bcryptjs');

class UsuarioService {
  async listar() {
    return await usuarioRepository.findAll();
  }

  async listarPendentes() {
    return await usuarioRepository.findPendentes();
  }

  async buscarPorId(id) {
    const usuario = await usuarioRepository.findById(id);
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
    // Remove senha do retorno por segurança
    delete usuario.senha;
    return usuario;
  }

  async buscarMeusDados(id) {
    const usuario = await usuarioRepository.findById(id);
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
    delete usuario.senha;
    return usuario;
  }

  async criar(dados) {
    const existingUser = await usuarioRepository.findByEmail(dados.email.toLowerCase());
    if (existingUser) {
      throw new Error('Email já cadastrado');
    }

    const senhaHash = await bcrypt.hash(dados.senha, 10);
    
    return await usuarioRepository.create({
      ...dados,
      email: dados.email.toLowerCase(),
      senha: senhaHash
    });
  }

  async atualizar(id, dados) {
    // Se atualizar email, verifica duplicidade
    if (dados.email) {
      const existingUser = await usuarioRepository.findByEmail(dados.email.toLowerCase());
      if (existingUser && existingUser.id !== id) {
        throw new Error('Email já cadastrado');
      }
      dados.email = dados.email.toLowerCase();
    }

    const usuario = await usuarioRepository.update(id, dados);
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
    return usuario;
  }

  async atualizarMeusDados(id, { nome, email, senhaAtual, senhaNova }) {
    const usuario = await usuarioRepository.findById(id);
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    if (senhaNova) {
      if (!senhaAtual) throw new Error('Senha atual é obrigatória');
      const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
      if (!senhaValida) throw new Error('Senha atual incorreta');
    }

    const dadosUpdate = {
      nome: nome || usuario.nome,
      email: (email || usuario.email).toLowerCase()
    };

    if (senhaNova) {
      dadosUpdate.senha = await bcrypt.hash(senhaNova, 10);
    }

    return await usuarioRepository.update(id, dadosUpdate);
  }

  async aprovar(id) {
    return await usuarioRepository.update(id, { ativo: true });
  }

  async alterarRole(id, role) {
    if (!['admin', 'editor'].includes(role)) {
      throw new Error('Role inválida');
    }
    return await usuarioRepository.update(id, { role });
  }

  async remover(id) {
    const usuario = await usuarioRepository.delete(id);
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
    return usuario;
  }
}

module.exports = new UsuarioService();
