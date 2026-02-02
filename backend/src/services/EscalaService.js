/*
  Sistema de Escalas - EscalaService
  Versão: 1.0 - Architecture Refactor
*/

const escalaRepository = require('../repositories/EscalaRepository');
const { verificarAcessoUnidade } = require('../middleware/access');

class EscalaService {
  /**
   * Determina a unidade alvo e verifica permissões
   */
  async _validarAcesso(user, targetUnidadeIdParam) {
    // 1. Resolve unidade alvo
    let targetUnidadeId = user.unidade_id;
    if (user.role === 'admin' && targetUnidadeIdParam) {
      targetUnidadeId = targetUnidadeIdParam;
    }

    if (!targetUnidadeId) {
      throw new Error('Unidade não identificada');
    }

    // 2. Verifica permissão na hierarquia
    const temAcesso = await verificarAcessoUnidade(
      user.id, user.unidade_id, user.role, targetUnidadeId
    );

    if (!temAcesso) {
      throw new Error('Permissão negada');
    }

    return targetUnidadeId;
  }

  async buscar(tipo, user, paramUnidadeId) {
    const unidadeId = await this._validarAcesso(user, paramUnidadeId);
    return await escalaRepository.findByUnidadeId(tipo, unidadeId);
  }

  async salvar(tipo, user, body) {
    const unidadeId = await this._validarAcesso(user, body.unidade_id);
    return await escalaRepository.upsert(tipo, unidadeId, body);
  }
}

module.exports = new EscalaService();
