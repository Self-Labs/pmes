/*
  Sistema de Escalas - UnidadeService
  Versão: 1.0 - Architecture Refactor
*/

const unidadeRepository = require('../repositories/UnidadeRepository');

class UnidadeService {
  async listar(ativo = true) {
    return await unidadeRepository.findAll({ ativo });
  }

  async listarTodas() {
    return await unidadeRepository.findAll({ ativo: null });
  }

  async listarArvore() {
    const unidades = await unidadeRepository.findAllForTree();
    
    // Constrói árvore hierárquica
    const map = {};
    const raiz = [];

    unidades.forEach(u => {
      map[u.id] = { ...u, filhos: [] };
    });

    unidades.forEach(u => {
      if (u.parent_id && map[u.parent_id]) {
        map[u.parent_id].filhos.push(map[u.id]);
      } else if (!u.parent_id) {
        raiz.push(map[u.id]);
      }
    });

    return raiz;
  }

  async criar(dados) {
    const { tipo } = dados;
    const tiposValidos = ['CPOR', 'CPOE', 'BPM', 'CIA_IND', 'CIA', 'COPOM', 'PELOTAO', 'OUTRO'];
    
    if (!tiposValidos.includes(tipo)) {
      throw new Error('Tipo de unidade inválido');
    }

    return await unidadeRepository.create(dados);
  }

  async atualizar(id, dados) {
    const unidade = await unidadeRepository.update(id, dados);
    if (!unidade) {
      throw new Error('Unidade não encontrada');
    }
    return unidade;
  }

  async remover(id) {
    const unidade = await unidadeRepository.delete(id);
    if (!unidade) {
      throw new Error('Unidade não encontrada');
    }
    return unidade;
  }
}

module.exports = new UnidadeService();
