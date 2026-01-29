/*
  Sistema de Escalas - JavaScript Diária
  Versão: 1.5
*/

let currentUnidadeId = null;
let isLoading = true;
let autoSaveTimer = null;
let dadosAlterados = false;

// Estado Global
const DB = {
  data_servico: '',
  config: {},
  efetivo: [],
  audiencias: []
};

// Máscara RG: 00.000-0
function mascaraRG(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 6);
  if (v.length > 5) v = v.replace(/(\d{2})(\d{3})(\d{1})/, '$1.$2-$3');
  else if (v.length > 2) v = v.replace(/(\d{2})(\d+)/, '$1.$2');
  input.value = v;
}

// === INICIALIZAÇÃO ===
(async () => {
  try {
    const user = await buscarMeuPerfil(); // Usa api.js
    document.getElementById('navbarUser').textContent = `${user.nome} (${user.role})`;

    currentUnidadeId = user.unidade_id;

    // Lógica ADMIN
    if (user.role === 'admin') {
      document.getElementById('adminMenu').classList.remove('hidden');

      const select = document.getElementById('adminUnitSelect');
      select.classList.remove('hidden');

      const unidades = await listarTodasUnidades(); // Usa api.js
      const mapUnidades = new Map(unidades.map(u => [u.id, u]));

      const getNomeCompleto = (u) => {
        if (!u.parent_id) return u.sigla;
        const pai = mapUnidades.get(u.parent_id);
        return pai ? `${getNomeCompleto(pai)} / ${u.sigla}` : u.sigla;
      };

      const listaOrdenada = unidades.map(u => ({
        id: u.id,
        nome: getNomeCompleto(u)
      })).sort((a, b) => a.nome.localeCompare(b.nome));

      select.innerHTML = listaOrdenada
        .map(u => `<option value="${u.id}">${u.nome}</option>`)
        .join('');

      const savedUnitId = localStorage.getItem('pmes_admin_last_unit');
      if (savedUnitId && unidades.some(u => u.id === savedUnitId)) {
        currentUnidadeId = savedUnitId;
      } else {
        currentUnidadeId = user.unidade_id || (unidades.length > 0 ? unidades[0].id : null);
      }

      if (currentUnidadeId) select.value = currentUnidadeId;

      select.addEventListener('change', (e) => {
        currentUnidadeId = e.target.value;
        localStorage.setItem('pmes_admin_last_unit', currentUnidadeId);
        carregarDados();
      });
    }

    document.body.classList.remove('auth-loading');
    carregarDados();
  } catch (err) {
    console.error(err);
    logout();
  }
})();

// === TABS ===
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// === EDIÇÃO / VISUALIZAÇÃO ===
document.getElementById('btnEditar').addEventListener('click', () => {
  document.getElementById('modoEdicao').classList.remove('hidden');
  document.getElementById('modoVisualizacao').classList.add('hidden');
  document.getElementById('btnEditar').className = 'btn btn-active';
  document.getElementById('btnVisualizar').className = 'btn btn-secondary';
});

document.getElementById('btnVisualizar').addEventListener('click', () => {
  coletarTudo();
  renderizarDocumento();
  document.getElementById('modoEdicao').classList.add('hidden');
  document.getElementById('modoVisualizacao').classList.remove('hidden');
  document.getElementById('btnVisualizar').className = 'btn btn-active';
  document.getElementById('btnEditar').className = 'btn btn-secondary';
});

// === AUTO-SAVE ===
function marcarAlterado() {
  if (isLoading) return;
  dadosAlterados = true;
  atualizarStatus('pendente');
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => salvarAgora(), 3000);
}

function atualizarStatus(status) {
  const el = document.getElementById('statusSalvo');
  el.className = 'status-salvo ' + status;
  switch(status) {
    case 'salvando': el.innerHTML = '⏳ Salvando...'; break;
    case 'salvo': el.innerHTML = '✓ Salvo'; break;
    case 'erro': el.innerHTML = '❌ Erro'; break;
    case 'pendente': el.innerHTML = '● Alterado'; break;
  }
}

async function salvarAgora() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  if (isLoading) return;

  atualizarStatus('salvando');

  try {
    coletarTudo();

    await salvarEscalaDiaria({
        unidade_id: currentUnidadeId,
        ...DB.config,
        data_servico: DB.data_servico,
        efetivo: DB.efetivo,
        audiencias: DB.audiencias
    });

    dadosAlterados = false;
    atualizarStatus('salvo');

    // Atualizar audit trail
    const user = await buscarMeuPerfil();
    const agora = new Date().toLocaleString('pt-BR');
    document.getElementById('auditTrail').textContent = `Última edição: ${agora} por ${user.nome}`;
  } catch (err) {
    atualizarStatus('erro');
    console.error('Erro ao salvar:', err);
  }
}

// === CARREGAR DADOS ===
async function carregarDados() {
  isLoading = true;
  try {
    const dados = await buscarEscalaDiaria(currentUnidadeId);

    if (dados) {
      // Formata a data (se existir) para YYYY-MM-DD
      DB.data_servico = '';
      if (dados.data_servico) {
        // Pega a parte da data do ISO string (YYYY-MM-DD)
        DB.data_servico = dados.data_servico.split('T')[0];
      }

      DB.config = {
        mostrar_iseo: dados.mostrar_iseo,
        mostrar_audiencias: dados.mostrar_audiencias,
        mostrar_totais: dados.mostrar_totais,
        mostrar_rodape: dados.mostrar_rodape,
        cabecalho_linha1: dados.cabecalho_linha1,
        cabecalho_linha2: dados.cabecalho_linha2,
        cabecalho_linha3: dados.cabecalho_linha3,
        cabecalho_linha4: dados.cabecalho_linha4,
        lema: dados.lema,
        titulo_escala: dados.titulo_escala,
        subtitulo: dados.subtitulo,
        brasao_esquerdo: dados.brasao_esquerdo,
        brasao_direito: dados.brasao_direito,
        observacoes: dados.observacoes,
        planejamento: dados.planejamento,
        outras_determinacoes: dados.outras_determinacoes,
        total_rh: dados.total_rh,
        total_rm: dados.total_rm,
        total_atestados: dados.total_atestados,
        total_operacoes: dados.total_operacoes,
        assinatura_nome: dados.assinatura_nome,
        assinatura_posto: dados.assinatura_posto,
        assinatura_funcao: dados.assinatura_funcao,
        assinatura_cidade: dados.assinatura_cidade,
        rodape_linha1: dados.rodape_linha1,
        rodape_linha2: dados.rodape_linha2,
        rodape_linha3: dados.rodape_linha3
      };
      DB.efetivo = dados.efetivo || [];
      DB.audiencias = dados.audiencias || [];

      // Audit trail
      if (dados.updated_at) {
        const dataAlt = new Date(dados.updated_at).toLocaleString('pt-BR');
        document.getElementById('auditTrail').textContent = `Última edição: ${dataAlt}`;
      }
    } else {
      // Valores padrão
      DB.data_servico = new Date().toISOString().split('T')[0];
      DB.config = {
        mostrar_iseo: false,
        mostrar_audiencias: false,
        mostrar_totais: false,
        mostrar_rodape: true,
        cabecalho_linha1: 'ESTADO DO ESPÍRITO SANTO',
        cabecalho_linha2: 'POLÍCIA MILITAR',
        lema: '"Policial Militar, herói protetor da sociedade"',
        titulo_escala: 'ESCALA DIÁRIA'
      };
      DB.efetivo = [];
      DB.audiencias = [];
    }

    carregarDadosUI();
  } catch (err) {
    console.error('Erro ao carregar:', err);
  }
  setTimeout(() => { isLoading = false; }, 500);
}

function carregarDadosUI() {
  const c = DB.config;

  // Data
  document.getElementById('dataServico').value = DB.data_servico || '';

  // Checkboxes
  document.getElementById('chkIseo').checked = c.mostrar_iseo || false;
  document.getElementById('chkAudiencias').checked = c.mostrar_audiencias || false;
  document.getElementById('chkTotais').checked = c.mostrar_totais || false;
  document.getElementById('chkRodape').checked = c.mostrar_rodape !== false;

  // Visibilidade seções
  document.getElementById('secaoIseo').classList.toggle('hidden', !c.mostrar_iseo);
  document.getElementById('secaoAudiencias').classList.toggle('hidden', !c.mostrar_audiencias);
  document.getElementById('secaoTotais').classList.toggle('hidden', !c.mostrar_totais);

  // Cabeçalho
  document.getElementById('cabLinha1').value = c.cabecalho_linha1 || '';
  document.getElementById('cabLinha2').value = c.cabecalho_linha2 || '';
  document.getElementById('cabLinha3').value = c.cabecalho_linha3 || '';
  document.getElementById('cabLinha4').value = c.cabecalho_linha4 || '';
  document.getElementById('lema').value = c.lema || '';
  document.getElementById('tituloEscala').value = c.titulo_escala || '';
  document.getElementById('subtitulo').value = c.subtitulo || '';

  // Textos
  document.getElementById('observacoes').value = c.observacoes || '';
  document.getElementById('planejamento').value = c.planejamento || '';
  document.getElementById('outrasDeterminacoes').value = c.outras_determinacoes || '';

  // Totais
  document.getElementById('totalRH').value = c.total_rh || 0;
  document.getElementById('totalRM').value = c.total_rm || 0;
  document.getElementById('totalAtestados').value = c.total_atestados || 0;
  document.getElementById('totalOperacoes').value = c.total_operacoes || 0;

  // Assinatura
  document.getElementById('assinaturaNome').value = c.assinatura_nome || '';
  document.getElementById('assinaturaPosto').value = c.assinatura_posto || '';
  document.getElementById('assinaturaFuncao').value = c.assinatura_funcao || '';
  document.getElementById('assinaturaCidade').value = c.assinatura_cidade || '';

  // Rodapé
  document.getElementById('rodapeLinha1').value = c.rodape_linha1 || '';
  document.getElementById('rodapeLinha2').value = c.rodape_linha2 || '';
  document.getElementById('rodapeLinha3').value = c.rodape_linha3 || '';

  // Tabelas
  renderEfetivo();
  renderAudiencias();
}

// === COLETAR TUDO ===
function coletarTudo() {
  DB.data_servico = document.getElementById('dataServico').value;

  DB.config = {
    mostrar_iseo: document.getElementById('chkIseo').checked,
    mostrar_audiencias: document.getElementById('chkAudiencias').checked,
    mostrar_totais: document.getElementById('chkTotais').checked,
    mostrar_rodape: document.getElementById('chkRodape').checked,
    cabecalho_linha1: document.getElementById('cabLinha1').value,
    cabecalho_linha2: document.getElementById('cabLinha2').value,
    cabecalho_linha3: document.getElementById('cabLinha3').value,
    cabecalho_linha4: document.getElementById('cabLinha4').value,
    lema: document.getElementById('lema').value,
    titulo_escala: document.getElementById('tituloEscala').value,
    subtitulo: document.getElementById('subtitulo').value,
    brasao_esquerdo: DB.config.brasao_esquerdo,
    brasao_direito: DB.config.brasao_direito,
    observacoes: document.getElementById('observacoes').value,
    planejamento: document.getElementById('planejamento').value,
    outras_determinacoes: document.getElementById('outrasDeterminacoes').value,
    total_rh: parseInt(document.getElementById('totalRH').value) || 0,
    total_rm: parseInt(document.getElementById('totalRM').value) || 0,
    total_atestados: parseInt(document.getElementById('totalAtestados').value) || 0,
    total_operacoes: parseInt(document.getElementById('totalOperacoes').value) || 0,
    assinatura_nome: document.getElementById('assinaturaNome').value,
    assinatura_posto: document.getElementById('assinaturaPosto').value,
    assinatura_funcao: document.getElementById('assinaturaFuncao').value,
    assinatura_cidade: document.getElementById('assinaturaCidade').value,
    rodape_linha1: document.getElementById('rodapeLinha1').value,
    rodape_linha2: document.getElementById('rodapeLinha2').value,
    rodape_linha3: document.getElementById('rodapeLinha3').value
  };

  coletarEfetivo();
  coletarAudiencias();
}

// === BRASÕES ===
function carregarBrasao(lado) {
  const input = document.getElementById(lado === 'esq' ? 'brasaoEsqFile' : 'brasaoDirFile');
  const file = input.files[0];
  if (!file) return;

  if (file.size > 1024 * 1024) {
    alert('⚠️ Imagem muito grande! Máximo 1MB.');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    if (lado === 'esq') DB.config.brasao_esquerdo = e.target.result;
    else DB.config.brasao_direito = e.target.result;
    marcarAlterado();
  };
  reader.readAsDataURL(file);
}

// === EFETIVO ===
function adicionarLinhaEfetivo(tipo) {
  DB.efetivo.push({ id: Date.now(), tipo, modalidade: '', setor: '', horario: '', viatura: '', militares: '' });
  renderEfetivo();
  marcarAlterado();
}

function removerEfetivo(id) {
  DB.efetivo = DB.efetivo.filter(e => e.id !== id);
  renderEfetivo();
  marcarAlterado();
}

function coletarEfetivo() {
  DB.efetivo = [];
  document.querySelectorAll('#tbodyEfetivo tr, #tbodyIseo tr').forEach(tr => {
    const hInicio = tr.querySelector('.ef-horario-inicio')?.value || '';
    const hFim = tr.querySelector('.ef-horario-fim')?.value || '';
    DB.efetivo.push({
      tipo: tr.dataset.tipo,
      modalidade: tr.querySelector('.ef-modalidade')?.value || '',
      setor: tr.querySelector('.ef-setor')?.value || '',
      horario: hInicio && hFim ? `${hInicio}-${hFim}` : (hInicio || hFim || ''),
      viatura: tr.querySelector('.ef-viatura')?.value || '',
      militares: tr.querySelector('.ef-militares')?.value || ''
    });
  });
}

function renderEfetivo() {
  const tbodyEfetivo = document.getElementById('tbodyEfetivo');
  const tbodyIseo = document.getElementById('tbodyIseo');
  tbodyEfetivo.innerHTML = '';
  tbodyIseo.innerHTML = '';

  DB.efetivo.forEach(e => {
    const tr = document.createElement('tr');
    tr.dataset.tipo = e.tipo || 'EFETIVO';
    const [hInicio, hFim] = (e.horario || '').split('-');
    tr.innerHTML = `
      <td><input type="text" class="form-input ef-modalidade" value="${e.modalidade || ''}" placeholder="RO DIURNA"></td>
      <td><input type="text" class="form-input ef-setor" value="${e.setor || ''}" placeholder="Centro"></td>
      <td><input type="time" class="form-input ef-horario-inicio" value="${hInicio || ''}" style="width:48%;"> <input type="time" class="form-input ef-horario-fim" value="${hFim || ''}" style="width:48%;"></td>
      <td><input type="text" class="form-input ef-viatura" value="${e.viatura || ''}" placeholder="RP 5187"></td>
      <td><textarea class="form-input ef-militares" rows="2" placeholder="Sd Fulano RG 12.345-6">${e.militares || ''}</textarea></td>
      <td style="text-align:center;"><button onclick="removerEfetivo(${e.id})" class="btn-icon" title="Remover">🗑️</button></td>
    `;

    if (e.tipo === 'ISEO') tbodyIseo.appendChild(tr);
    else tbodyEfetivo.appendChild(tr);
  });
}

// === AUDIÊNCIAS ===
function adicionarLinhaAudiencia() {
  DB.audiencias.push({ id: Date.now(), militar: '', rg: '', horario: '', local: '' });
  renderAudiencias();
  marcarAlterado();
}

function removerAudiencia(id) {
  DB.audiencias = DB.audiencias.filter(a => a.id !== id);
  renderAudiencias();
  marcarAlterado();
}

function coletarAudiencias() {
  DB.audiencias = [];
  document.querySelectorAll('#tbodyAudiencias tr').forEach(tr => {
    DB.audiencias.push({
      militar: tr.querySelector('.aud-militar')?.value || '',
      rg: tr.querySelector('.aud-rg')?.value || '',
      horario: tr.querySelector('.aud-horario')?.value || '',
      local: tr.querySelector('.aud-local')?.value || ''
    });
  });
}

function renderAudiencias() {
  const tbody = document.getElementById('tbodyAudiencias');
  tbody.innerHTML = '';

  DB.audiencias.forEach(a => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="form-input aud-militar" value="${a.militar || ''}" placeholder="Nome"></td>
      <td><input type="text" class="form-input aud-rg" value="${a.rg || ''}" placeholder="00.000-0" oninput="mascaraRG(this)"></td>
      <td><input type="time" class="form-input aud-horario" value="${a.horario || ''}"></td>
      <td><input type="text" class="form-input aud-local" value="${a.local || ''}" placeholder="Fórum de..."></td>
      <td style="text-align:center;"><button onclick="removerAudiencia(${a.id})" class="btn-icon" title="Remover">🗑️</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// === RENDERIZAR DOCUMENTO (Visualização) ===
function renderizarDocumento() {
  const c = DB.config;
  // Ajuste data para evitar timezone offset (pega meio dia)
  const data = DB.data_servico ? new Date(DB.data_servico + 'T12:00:00') : new Date();
  const dias = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
  const dataFormatada = data.toLocaleDateString('pt-BR');
  const diaSemana = dias[data.getDay()];

  // Brasões
  const brasaoEsqHTML = c.brasao_esquerdo
    ? `<img src="${c.brasao_esquerdo}" style="height: 70px;">`
    : '<div style="width:70px;height:70px;border:1px solid #ccc;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">Brasão</div>';
  const brasaoDirHTML = c.brasao_direito
    ? `<img src="${c.brasao_direito}" style="height: 70px;">`
    : '<div style="width:70px;height:70px;border:1px solid #ccc;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">Brasão</div>';

  document.getElementById('viewBrasaoEsq').innerHTML = brasaoEsqHTML;
  document.getElementById('viewBrasaoDir').innerHTML = brasaoDirHTML;

  // Header
  document.getElementById('viewHeaderTexto').innerHTML = `
    <p style="font-size: 13px; font-weight: bold;">${c.cabecalho_linha1 || ''}</p>
    <p style="font-size: 18px; font-weight: bold;">${c.cabecalho_linha2 || ''}</p>
    <p style="font-size: 13px; font-weight: bold;">${c.cabecalho_linha3 || ''}</p>
    ${c.cabecalho_linha4 ? `<p style="font-size: 12px;">${c.cabecalho_linha4}</p>` : ''}
    <p style="font-size: 12px; font-style: italic;">${c.lema || ''}</p>
  `;

  // Título
  document.getElementById('viewTitulo').textContent = c.titulo_escala || '';
  document.getElementById('viewSubtitulo').textContent = `Serviço do dia ${dataFormatada} - ${diaSemana}`;

  // Tabela Efetivo
  const efetivoData = DB.efetivo.filter(e => e.tipo !== 'ISEO');
  let html = `
    <thead><tr style="background: #e5e7eb;">
      <th colspan="5" style="text-align:center; font-weight:bold;">EMPENHO DO EFETIVO DIÁRIO</th>
    </tr>
    <tr style="background: #f3f4f6;">
      <th>Modalidade</th><th>Setor</th><th>Horário</th><th>Viatura</th><th>Nome/RG</th>
    </tr></thead><tbody>
  `;
  efetivoData.forEach(e => {
    const mils = (e.militares || '').split('\n').join('<br>');
    html += `<tr><td>${e.modalidade}</td><td>${e.setor}</td><td>${e.horario}</td><td>${e.viatura}</td><td>${mils}</td></tr>`;
  });
  html += '</tbody>';
  document.getElementById('viewTabelaEfetivo').innerHTML = html;

  // ISEO
  if (c.mostrar_iseo) {
    const iseoData = DB.efetivo.filter(e => e.tipo === 'ISEO');
    let iseoHtml = `<table class="print-table print-table-diaria" style="margin-top:12px;">
      <thead><tr style="background:#e5e7eb;"><th colspan="5" style="text-align:center;font-weight:bold;">ESCALA ESPECIAL - ISEO - OUTROS</th></tr>
      <tr style="background:#f3f4f6;"><th>Evento</th><th>Local</th><th>Horário</th><th>Viatura</th><th>Nome/RG</th></tr></thead><tbody>`;
    iseoData.forEach(e => {
      const mils = (e.militares || '').split('\n').join('<br>');
      iseoHtml += `<tr><td>${e.modalidade}</td><td>${e.setor}</td><td>${e.horario}</td><td>${e.viatura}</td><td>${mils}</td></tr>`;
    });
    iseoHtml += '</tbody></table>';
    document.getElementById('viewSecaoIseo').innerHTML = iseoHtml;
  } else {
    document.getElementById('viewSecaoIseo').innerHTML = '';
  }

  // Observações
  if (c.observacoes) {
    document.getElementById('viewObservacoes').innerHTML = `
      <div style="margin-top:12px;border:1px solid #000;"><div style="background:#e5e7eb;text-align:center;font-weight:bold;padding:4px;">TROCAS DE SERVIÇO / DISPENSAS / OBSERVAÇÕES</div>
      <div style="padding:8px;white-space:pre-wrap;">${c.observacoes}</div></div>`;
  } else {
    document.getElementById('viewObservacoes').innerHTML = '';
  }

  // Audiências
  if (c.mostrar_audiencias && DB.audiencias.length > 0) {
    let audHtml = `<table class="print-table print-table-diaria" style="margin-top:12px;">
      <thead><tr style="background:#e5e7eb;"><th colspan="4" style="text-align:center;font-weight:bold;">INTIMAÇÕES PARA AUDIÊNCIAS JUDICIAIS</th></tr>
      <tr style="background:#f3f4f6;"><th>Militar</th><th>RG</th><th>Horário</th><th>Local</th></tr></thead><tbody>`;
    DB.audiencias.forEach(a => {
      audHtml += `<tr><td>${a.militar}</td><td>${a.rg}</td><td>${a.horario}</td><td>${a.local}</td></tr>`;
    });
    audHtml += '</tbody></table><p style="font-size:10px;font-style:italic;padding:4px;">Obs.: Este não é o meio oficial de intimação.</p>';
    document.getElementById('viewSecaoAudiencias').innerHTML = audHtml;
  } else {
    document.getElementById('viewSecaoAudiencias').innerHTML = '';
  }

  // Planejamento
  if (c.planejamento) {
    document.getElementById('viewPlanejamento').innerHTML = `
      <div style="margin-top:12px;border:1px solid #000;"><div style="background:#e5e7eb;text-align:center;font-weight:bold;padding:4px;">PLANEJAMENTO OPERACIONAL</div>
      <div style="padding:8px;white-space:pre-wrap;">${c.planejamento}</div></div>`;
  } else {
    document.getElementById('viewPlanejamento').innerHTML = '';
  }

  // Outras Determinações
  if (c.outras_determinacoes) {
    document.getElementById('viewOutrasDeterminacoes').innerHTML = `
      <div style="margin-top:12px;border:1px solid #000;"><div style="background:#e5e7eb;text-align:center;font-weight:bold;padding:4px;">OUTRAS DETERMINAÇÕES</div>
      <div style="padding:8px;white-space:pre-wrap;">${c.outras_determinacoes}</div></div>`;
  } else {
    document.getElementById('viewOutrasDeterminacoes').innerHTML = '';
  }

  // Totais
  if (c.mostrar_totais) {
    document.getElementById('viewSecaoTotais').innerHTML = `
      <table class="print-table print-table-diaria" style="margin-top:12px;">
        <thead><tr style="background:#e5e7eb;"><th colspan="4" style="text-align:center;font-weight:bold;">TOTAL</th></tr>
        <tr style="background:#f3f4f6;"><th>RECURSOS HUMANOS</th><th>RECURSOS MATERIAIS</th><th>ATESTADOS MÉDICOS</th><th>TOTAL DE OPERAÇÕES</th></tr></thead>
        <tbody><tr style="text-align:center;"><td>${c.total_rh || 0}</td><td>${c.total_rm || 0}</td><td>${c.total_atestados || 0}</td><td>${c.total_operacoes || 0}</td></tr></tbody>
      </table>`;
  } else {
    document.getElementById('viewSecaoTotais').innerHTML = '';
  }

  // Assinatura
  let assHtml = `<p style="margin-bottom:4px;">${c.assinatura_cidade || ''}, na data da assinatura.</p>
    <div style="display:inline-block;border-top:1px solid #000;padding-top:8px;min-width:250px;">
      <p style="font-weight:bold;">${c.assinatura_nome || ''}</p>
      <p>${c.assinatura_posto || ''}${c.assinatura_posto && c.assinatura_funcao ? ' – ' : ''}${c.assinatura_funcao || ''}</p>
    </div>`;
  document.getElementById('viewAssinatura').innerHTML = assHtml;

  // Rodapé
  if (c.mostrar_rodape) {
    document.getElementById('viewRodape').innerHTML = `
      <p style="font-weight:bold;">${c.rodape_linha1 || ''}</p>
      <p>${c.rodape_linha2 || ''}</p>
      <p>${c.rodape_linha3 || ''}</p>`;
  } else {
    document.getElementById('viewRodape').innerHTML = '';
  }
}

// === LISTENERS AUTO-SAVE ===
document.querySelectorAll('#tab-config input, #tab-config textarea, #tab-config select').forEach(el => {
  el.addEventListener('input', marcarAlterado);
  el.addEventListener('change', marcarAlterado);
});
document.querySelectorAll('#tab-observacoes input, #tab-observacoes textarea').forEach(el => {
  el.addEventListener('input', marcarAlterado);
});
document.querySelectorAll('#tab-assinatura input').forEach(el => {
  el.addEventListener('input', marcarAlterado);
});

// Checkboxes de seções
document.getElementById('chkIseo').addEventListener('change', (e) => {
  document.getElementById('secaoIseo').classList.toggle('hidden', !e.target.checked);
  marcarAlterado();
});
document.getElementById('chkAudiencias').addEventListener('change', (e) => {
  document.getElementById('secaoAudiencias').classList.toggle('hidden', !e.target.checked);
  marcarAlterado();
});
document.getElementById('chkTotais').addEventListener('change', (e) => {
  document.getElementById('secaoTotais').classList.toggle('hidden', !e.target.checked);
  marcarAlterado();
});
document.getElementById('chkRodape').addEventListener('change', marcarAlterado);

// Observer para tabelas dinâmicas
const observerConfig = { childList: true, subtree: true, characterData: true };
const observer = new MutationObserver(() => { if (!isLoading) marcarAlterado(); });
observer.observe(document.getElementById('tbodyEfetivo'), observerConfig);
observer.observe(document.getElementById('tbodyIseo'), observerConfig);
observer.observe(document.getElementById('tbodyAudiencias'), observerConfig);

console.log('🚀 Escala Diária v1.5');