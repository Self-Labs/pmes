/*
  Sistema de Escalas - DiariaRepository
  Versão: 1.0 - Architecture Refactor
*/

const db = require('../config/db');

class DiariaRepository {
  async findByUnidadeId(unidadeId) {
    const escala = await db.query(
      `SELECT ed.*, u.nome as editado_por 
       FROM escalas_diarias ed 
       LEFT JOIN usuarios u ON ed.usuario_id = u.id 
       WHERE ed.unidade_id = $1`,
      [unidadeId]
    );

    if (escala.rows.length === 0) return null;

    const escalaId = escala.rows[0].id;

    // Parallel fetch of details
    const [efetivo, audiencias] = await Promise.all([
      db.query(
        'SELECT * FROM escalas_diarias_efetivo WHERE escala_id = $1 ORDER BY tipo, ordem',
        [escalaId]
      ),
      db.query(
        'SELECT * FROM escalas_diarias_audiencias WHERE escala_id = $1 ORDER BY ordem',
        [escalaId]
      )
    ]);

    return {
      ...escala.rows[0],
      efetivo: efetivo.rows,
      audiencias: audiencias.rows
    };
  }

  async upsert(usuarioId, data) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        unidade_id, data_servico,
        mostrar_iseo, mostrar_audiencias, mostrar_totais, mostrar_rodape,
        cabecalho_linha1, cabecalho_linha2, cabecalho_linha3, cabecalho_linha4,
        lema, titulo_escala, subtitulo,
        brasao_esquerdo, brasao_direito,
        observacoes, planejamento, outras_determinacoes,
        total_rh, total_rm, total_atestados, total_operacoes,
        assinatura_nome, assinatura_posto, assinatura_funcao, assinatura_cidade,
        rodape_linha1, rodape_linha2, rodape_linha3,
        efetivo, audiencias
      } = data;

      // Check existence
      const existente = await client.query(
        'SELECT id FROM escalas_diarias WHERE unidade_id = $1',
        [unidade_id]
      );

      let escalaId;

      if (existente.rows.length > 0) {
        // Update
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
          usuarioId, data_servico || null,
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

        // Clean details
        await client.query('DELETE FROM escalas_diarias_efetivo WHERE escala_id = $1', [escalaId]);
        await client.query('DELETE FROM escalas_diarias_audiencias WHERE escala_id = $1', [escalaId]);
      } else {
        // Create
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
          usuarioId, unidade_id, data_servico || null,
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

      // Insert Efetivo
      if (efetivo && efetivo.length > 0) {
        for (let i = 0; i < efetivo.length; i++) {
          const e = efetivo[i];
          await client.query(`
            INSERT INTO escalas_diarias_efetivo (
              escala_id, tipo, ordem, modalidade, setor, horario, viatura, militares, rg
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            escalaId, e.tipo || 'EFETIVO', i, 
            e.modalidade, e.setor, e.horario, e.viatura, e.militares, e.rg || ''
          ]);
        }
      }

      // Insert Audiencias
      if (audiencias && audiencias.length > 0) {
        for (let i = 0; i < audiencias.length; i++) {
          const a = audiencias[i];
          await client.query(`
            INSERT INTO escalas_diarias_audiencias (
              escala_id, ordem, militar, rg, horario, local
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [escalaId, i, a.militar, a.rg, a.horario, a.local]);
        }
      }

      await client.query('COMMIT');
      return { id: escalaId };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new DiariaRepository();
