/*
  Sistema de Escalas - Escalas Diárias
  Versão: 1.5
*/

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Verificar se usuário tem acesso à unidade (mesma ou filha)
async function verificarAcessoUnidade(userId, userUnidadeId, userRole, unidadeAlvo) {
  if (userRole === 'admin') return true;
  if (userUnidadeId === unidadeAlvo) return true;

  // Verificar se unidadeAlvo é filha (recursivo)
  const result = await db.query(`
    WITH RECURSIVE hierarquia AS (
      SELECT id, parent_id FROM unidades WHERE id = $1
      UNION ALL
      SELECT u.id, u.parent_id FROM unidades u
      INNER JOIN hierarquia h ON u.parent_id = h.id
    )
    SELECT id FROM hierarquia WHERE id = $2
  `, [userUnidadeId, unidadeAlvo]);

  return result.rows.length > 0;
}

// GET - Buscar escala por unidade (uma por unidade)
router.get('/', async (req, res) => {
  try {
    const { unidade_id } = req.query;

    if (!unidade_id) {
      return res.status(400).json({ error: 'unidade_id é obrigatório' });
    }

    // Verificar acesso
    const temAcesso = await verificarAcessoUnidade(
      req.user.id, req.user.unidade_id, req.user.role, unidade_id
    );
    if (!temAcesso) {
      return res.status(403).json({ error: 'Sem permissão para esta unidade' });
    }

    const escala = await db.query(
      'SELECT * FROM escalas_diarias WHERE unidade_id = $1',
      [unidade_id]
    );

    if (escala.rows.length === 0) {
      return res.json(null);
    }

    const escalaId = escala.rows[0].id;

    // Buscar efetivo
    const efetivo = await db.query(
      'SELECT * FROM escalas_diarias_efetivo WHERE escala_id = $1 ORDER BY tipo, ordem',
      [escalaId]
    );

    // Buscar audiências
    const audiencias = await db.query(
      'SELECT * FROM escalas_diarias_audiencias WHERE escala_id = $1 ORDER BY ordem',
      [escalaId]
    );

    res.json({
      ...escala.rows[0],
      efetivo: efetivo.rows,
      audiencias: audiencias.rows
    });
  } catch (error) {
    console.error('Erro ao buscar escala diária:', error);
    res.status(500).json({ error: 'Erro ao buscar escala diária' });
  }
});

// POST - Criar ou atualizar escala (uma por unidade)
router.post('/', async (req, res) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    let { data_servico } = req.body;

    const {
      unidade_id,
      mostrar_iseo, mostrar_audiencias, mostrar_totais, mostrar_rodape,
      cabecalho_linha1, cabecalho_linha2, cabecalho_linha3, cabecalho_linha4,
      lema, titulo_escala, subtitulo,
      brasao_esquerdo, brasao_direito,
      observacoes, planejamento, outras_determinacoes,
      total_rh, total_rm, total_atestados, total_operacoes,
      assinatura_nome, assinatura_posto, assinatura_funcao, assinatura_cidade,
      rodape_linha1, rodape_linha2, rodape_linha3,
      efetivo, audiencias
    } = req.body;

    const temAcesso = await verificarAcessoUnidade(
      req.user.id, req.user.unidade_id, req.user.role, unidade_id
    );
    if (!temAcesso) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Sem permissão para esta unidade' });
    }

    // Trata string vazia para NULL (sem crashar variavel const)
    if (data_servico === '') data_servico = null;

    const usuario_id = req.user.id;

    // Verificar se já existe escala para esta unidade
    const existente = await client.query(
      'SELECT id FROM escalas_diarias WHERE unidade_id = $1',
      [unidade_id]
    );

    let escalaId;

    if (existente.rows.length > 0) {
      // Atualizar
      escalaId = existente.rows[0].id;

      await client.query(`
        UPDATE escalas_diarias SET
          usuario_id = $1, data_servico = $2,
          mostrar_iseo = $3, mostrar_audiencias = $4, mostrar_totais = $5, mostrar_rodape = $6,
          cabecalho_linha1 = $7, cabecalho_linha2 = $8, cabecalho_linha3 = $9, cabecalho_linha4 = $10,
          lema = $11, titulo_escala = $12, subtitulo = $13,
          brasao_esquerdo = $14, brasao_direito = $15,
          observacoes = $16, planejamento = $17, outras_determinacoes = $18,
          total_rh = $19, total_rm = $20, total_atestados = $21, total_operacoes = $22,
          assinatura_nome = $23, assinatura_posto = $24, assinatura_funcao = $25, assinatura_cidade = $26,
          rodape_linha1 = $27, rodape_linha2 = $28, rodape_linha3 = $29,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $30
      `, [
        usuario_id, data_servico,
        mostrar_iseo, mostrar_audiencias, mostrar_totais, mostrar_rodape,
        cabecalho_linha1, cabecalho_linha2, cabecalho_linha3, cabecalho_linha4,
        lema, titulo_escala, subtitulo,
        brasao_esquerdo, brasao_direito,
        observacoes, planejamento, outras_determinacoes,
        total_rh, total_rm, total_atestados, total_operacoes,
        assinatura_nome, assinatura_posto, assinatura_funcao, assinatura_cidade,
        rodape_linha1, rodape_linha2, rodape_linha3,
        escalaId
      ]);

      // Limpar efetivo e audiências existentes
      await client.query('DELETE FROM escalas_diarias_efetivo WHERE escala_id = $1', [escalaId]);
      await client.query('DELETE FROM escalas_diarias_audiencias WHERE escala_id = $1', [escalaId]);
    } else {
      // Criar nova
      const nova = await client.query(`
        INSERT INTO escalas_diarias (
          usuario_id, unidade_id, data_servico,
          mostrar_iseo, mostrar_audiencias, mostrar_totais, mostrar_rodape,
          cabecalho_linha1, cabecalho_linha2, cabecalho_linha3, cabecalho_linha4,
          lema, titulo_escala, subtitulo,
          brasao_esquerdo, brasao_direito,
          observacoes, planejamento, outras_determinacoes,
          total_rh, total_rm, total_atestados, total_operacoes,
          assinatura_nome, assinatura_posto, assinatura_funcao, assinatura_cidade,
          rodape_linha1, rodape_linha2, rodape_linha3
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
        RETURNING id
      `, [
        usuario_id, unidade_id, data_servico,
        mostrar_iseo, mostrar_audiencias, mostrar_totais, mostrar_rodape,
        cabecalho_linha1, cabecalho_linha2, cabecalho_linha3, cabecalho_linha4,
        lema, titulo_escala, subtitulo,
        brasao_esquerdo, brasao_direito,
        observacoes, planejamento, outras_determinacoes,
        total_rh, total_rm, total_atestados, total_operacoes,
        assinatura_nome, assinatura_posto, assinatura_funcao, assinatura_cidade,
        rodape_linha1, rodape_linha2, rodape_linha3
      ]);

      escalaId = nova.rows[0].id;
    }

    // Inserir efetivo
    if (efetivo && efetivo.length > 0) {
      for (let i = 0; i < efetivo.length; i++) {
        const e = efetivo[i];
        await client.query(`
          INSERT INTO escalas_diarias_efetivo (escala_id, tipo, ordem, modalidade, setor, horario, viatura, militares)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [escalaId, e.tipo || 'EFETIVO', i, e.modalidade, e.setor, e.horario, e.viatura, e.militares]);
      }
    }

    // Inserir audiências
    if (audiencias && audiencias.length > 0) {
      for (let i = 0; i < audiencias.length; i++) {
        const a = audiencias[i];
        await client.query(`
          INSERT INTO escalas_diarias_audiencias (escala_id, ordem, militar, rg, horario, local)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [escalaId, i, a.militar, a.rg, a.horario, a.local]);
      }
    }

    await client.query('COMMIT');

    res.json({ success: true, id: escalaId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao salvar escala diária:', error);
    res.status(500).json({ error: 'Erro ao salvar escala diária' });
  } finally {
    client.release();
  }
});

module.exports = router;