/*
  Sistema de Escalas - DiariaService
  Versão: 1.0 - Architecture Refactor
*/

const diariaRepository = require('../repositories/DiariaRepository');
const { verificarAcessoUnidade } = require('../middleware/access');

class DiariaService {
  async buscar(user, unidadeId) {
    if (!unidadeId) {
      throw new Error('unidade_id é obrigatório');
    }

    // Usando validação de acesso centralizada
    const temAcesso = await verificarAcessoUnidade(
      user.id, user.unidade_id, user.role, unidadeId
    );
    
    if (!temAcesso) {
      throw new Error('Sem permissão para esta unidade');
    }

    return await diariaRepository.findByUnidadeId(unidadeId);
  }

  async salvar(user, data) {
    const { unidade_id } = data;

    const temAcesso = await verificarAcessoUnidade(
      user.id, user.unidade_id, user.role, unidade_id
    );

    if (!temAcesso) {
      throw new Error('Sem permissão para esta unidade');
    }

    return await diariaRepository.upsert(user.id, data);
  }
}

module.exports = new DiariaService();
