/*
  Sistema de Escalas - JavaScript Diária
  Versão: 2.6
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
        const editor = dados.editado_por ? ` por ${dados.editado_por}` : '';
        document.getElementById('auditTrail').textContent = `Última edição: ${dataAlt}${editor}`;
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

// Calcula totais RH e RM automaticamente
function calcularTotais() {
  let totalMilitares = 0;
  let totalViaturas = 0;

  DB.efetivo.forEach(e => {
    // Conta cada linha de militar
    (e.militares || '').split('\n').forEach(m => {
      if (m.trim()) totalMilitares++;
    });
    // Conta cada empenho de viatura
    if (e.viatura && e.viatura.trim()) {
      totalViaturas++;
    }
  });

  document.getElementById('totalRH').value = totalMilitares;
  document.getElementById('totalRM').value = totalViaturas;
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
  calcularTotais();
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
  coletarEfetivo();
  DB.efetivo.push({ id: Date.now(), tipo, modalidade: '', setor: '', horario: '', viatura: '', militares: '', rg: '' });
  renderEfetivo();
  marcarAlterado();
}

function removerEfetivo(id) {
  coletarEfetivo();
  DB.efetivo = DB.efetivo.filter(e => String(e.id) !== String(id));
  renderEfetivo();
  marcarAlterado();
}

function coletarEfetivo() {
  DB.efetivo = [];
  document.querySelectorAll('#tbodyEfetivo tr, #tbodyIseo tr').forEach(tr => {
    const hInicio = tr.querySelector('.ef-horario-inicio')?.value || '';
    const hFim = tr.querySelector('.ef-horario-fim')?.value || '';
    DB.efetivo.push({
      id: tr.dataset.id,
      tipo: tr.dataset.tipo,
      modalidade: tr.querySelector('.ef-modalidade')?.value || '',
      setor: tr.querySelector('.ef-setor')?.value || '',
      horario: hInicio && hFim ? `${hInicio}-${hFim}` : (hInicio || hFim || ''),
      viatura: tr.querySelector('.ef-viatura')?.value || '',
      militares: tr.querySelector('.ef-militares')?.value || '',
      rg: tr.querySelector('.ef-rg')?.value || ''
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
    tr.dataset.id = e.id;
    tr.dataset.tipo = e.tipo || 'EFETIVO';
    const [hInicio, hFim] = (e.horario || '').split('-');
    const placeholderMod = e.tipo === 'ISEO' ? 'Policiamento...' : 'RO/RI/NPC...';
    tr.innerHTML = `
      <td><input type="text" class="form-input ef-modalidade" value="${e.modalidade || ''}" placeholder="${placeholderMod}"></td>
      <td><input type="text" class="form-input ef-setor" value="${e.setor || ''}" placeholder="Centro"></td>
      <td style="text-align:center;"><input type="time" class="form-input ef-horario-inicio" value="${hInicio || ''}" style="width:90%;"><br><input type="time" class="form-input ef-horario-fim" value="${hFim || ''}" style="width:90%;"></td>
      <td><input type="text" class="form-input ef-viatura" value="${e.viatura || ''}" placeholder="RP 5187"></td>
      <td><textarea class="form-input ef-militares" rows="2" placeholder="Cb João&#10;Sd Maria">${e.militares || ''}</textarea></td>
      <td><textarea class="form-input ef-rg" rows="2" placeholder="12.345-6&#10;23.456-7">${e.rg || ''}</textarea></td>
      <td style="text-align:center;"><button onclick="removerEfetivo('${e.id}')" class="btn-icon" title="Remover">🗑️</button></td>
    `;

    if (e.tipo === 'ISEO') tbodyIseo.appendChild(tr);
    else tbodyEfetivo.appendChild(tr);
  });
}

// === AUDIÊNCIAS ===
function adicionarLinhaAudiencia() {
  coletarAudiencias();
  DB.audiencias.push({ id: Date.now(), militar: '', rg: '', horario: '', local: '' });
  renderAudiencias();
  marcarAlterado();
}

function removerAudiencia(id) {
  coletarAudiencias();
  DB.audiencias = DB.audiencias.filter(a => String(a.id) !== String(id));
  renderAudiencias();
  marcarAlterado();
}

function coletarAudiencias() {
  DB.audiencias = [];
  document.querySelectorAll('#tbodyAudiencias tr').forEach(tr => {
    DB.audiencias.push({
      id: tr.dataset.id,
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
    tr.dataset.id = a.id;
    tr.innerHTML = `
      <td><input type="text" class="form-input aud-militar" value="${a.militar || ''}" placeholder="Nome"></td>
      <td><input type="text" class="form-input aud-rg" value="${a.rg || ''}" placeholder="00.000-0" oninput="mascaraRG(this)"></td>
      <td><input type="time" class="form-input aud-horario" value="${a.horario || ''}"></td>
      <td><input type="text" class="form-input aud-local" value="${a.local || ''}" placeholder="Fórum de..."></td>
      <td style="text-align:center;"><button onclick="removerAudiencia('${a.id}')" class="btn-icon" title="Remover">🗑️</button></td>
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

  // Estilo padrão para headers (garante uniformidade)
  const headerStyle = 'background:#e5e7eb;text-align:center;font-weight:bold;padding:4px;border:1px solid #000;font-size:12px;font-family:inherit;';
  // Estilo padrão para headers de blocos de texto (borda inferior)
  const textBlockHeaderStyle = 'background:#e5e7eb;text-align:center;font-weight:bold;padding:4px;border-bottom:1px solid #000;font-size:12px;font-family:inherit;';

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
    <p style="font-size: 13px; font-weight: bold;">${escapeHTML(c.cabecalho_linha1 || '')}</p>
    <p style="font-size: 18px; font-weight: bold;">${escapeHTML(c.cabecalho_linha2 || '')}</p>
    <p style="font-size: 13px; font-weight: bold;">${escapeHTML(c.cabecalho_linha3 || '')}</p>
    ${c.cabecalho_linha4 ? `<p style="font-size: 12px;">${escapeHTML(c.cabecalho_linha4)}</p>` : ''}
    <p style="font-size: 12px; font-style: italic;">${escapeHTML(c.lema || '')}</p>
  `;

  // Título
  document.getElementById('viewTitulo').textContent = c.titulo_escala || '';
  document.getElementById('viewSubtitulo').innerHTML = `Serviço do dia ${dataFormatada} - <b>${diaSemana}</b>`;

  // Tabela Efetivo
  const efetivoData = DB.efetivo.filter(e => e.tipo !== 'ISEO');

  // Expandir para linhas individuais
  const linhasExpandidas = [];
  efetivoData.forEach((e, idx) => {
    const militares = (e.militares || '').split('\n').filter(m => m.trim());
    const rgs = (e.rg || '').split('\n');
    const qtd = militares.length || 1;
    for (let i = 0; i < qtd; i++) {
      linhasExpandidas.push({
        efetivoIdx: idx,
        modalidade: e.modalidade,
        setor: e.setor,
        horario: e.horario,
        viatura: e.viatura,
        militar: militares[i] || '',
        rg: rgs[i] || '',
        milIndex: i,
        milTotal: qtd
      });
    }
  });

  // Calcular rowspans
  const spanModalidade = calcularRowspans(linhasExpandidas, 'modalidade');
  const spanSetor = calcularRowspans(linhasExpandidas, 'setor');
  const spanHorario = calcularRowspans(linhasExpandidas, 'horario');

  let html = `
    <thead><tr><th colspan="6" style="${headerStyle}">EMPENHO DO EFETIVO DIÁRIO</th></tr>
    <tr style="background:#f3f4f6;"><th>Modalidade</th><th>Setor</th><th>Horário</th><th>Viatura</th><th>Militares</th><th>RG</th></tr></thead><tbody>
  `;

  linhasExpandidas.forEach((linha, i) => {
    const bordaMil = linha.milIndex > 0 ? 'no-border-top' : '';
    html += '<tr>';
    if (spanModalidade[i] > 0) html += `<td rowspan="${spanModalidade[i]}" class="cell-center">${escapeHTML(linha.modalidade)}</td>`;
    if (spanSetor[i] > 0) html += `<td rowspan="${spanSetor[i]}" class="cell-center">${escapeHTML(linha.setor)}</td>`;
    if (spanHorario[i] > 0) html += `<td rowspan="${spanHorario[i]}" class="cell-center">${escapeHTML(linha.horario)}</td>`;
    if (linha.milIndex === 0) html += `<td rowspan="${linha.milTotal}" class="cell-center">${escapeHTML(linha.viatura)}</td>`;
    html += `<td class="${bordaMil} cell-left">${escapeHTML(linha.militar)}</td>`;
    html += `<td class="${bordaMil} cell-center">${escapeHTML(linha.rg)}</td>`;
    html += '</tr>';
  });

  if (linhasExpandidas.length === 0) {
    html += '<tr><td colspan="6" style="text-align:center;color:#999;">Nenhum efetivo cadastrado</td></tr>';
  }

  html += '</tbody>';
  document.getElementById('viewTabelaEfetivo').innerHTML = html;

  // ISEO
  if (c.mostrar_iseo) {
    const iseoData = DB.efetivo.filter(e => e.tipo === 'ISEO');
    
    // Expandir para linhas individuais
    const linhasIseo = [];
    iseoData.forEach((e, idx) => {
      const militares = (e.militares || '').split('\n').filter(m => m.trim());
      const rgs = (e.rg || '').split('\n');
      const qtd = militares.length || 1;
      for (let i = 0; i < qtd; i++) {
        linhasIseo.push({
          efetivoIdx: idx,
          modalidade: e.modalidade,
          setor: e.setor,
          horario: e.horario,
          viatura: e.viatura,
          militar: militares[i] || '',
          rg: rgs[i] || '',
          milIndex: i,
          milTotal: qtd
        });
      }
    });

    // Calcular rowspans
    const spanModalidade = calcularRowspans(linhasIseo, 'modalidade');
    const spanSetor = calcularRowspans(linhasIseo, 'setor');
    const spanHorario = calcularRowspans(linhasIseo, 'horario');

    let iseoHtml = `<table class="print-table print-table-diaria" style="margin-top:12px;">
      <thead><tr><th colspan="6" style="${headerStyle}">ESCALA ESPECIAL - ISEO - OUTROS</th></tr>
      <tr style="background:#f3f4f6;"><th>Evento</th><th>Local</th><th>Horário</th><th>Viatura</th><th>Militares</th><th>RG</th></tr></thead><tbody>`;

    linhasIseo.forEach((linha, i) => {
      const bordaMil = linha.milIndex > 0 ? 'no-border-top' : '';
      iseoHtml += '<tr>';
      if (spanModalidade[i] > 0) iseoHtml += `<td rowspan="${spanModalidade[i]}" class="cell-center">${escapeHTML(linha.modalidade)}</td>`;
      if (spanSetor[i] > 0) iseoHtml += `<td rowspan="${spanSetor[i]}" class="cell-center">${escapeHTML(linha.setor)}</td>`;
      if (spanHorario[i] > 0) iseoHtml += `<td rowspan="${spanHorario[i]}" class="cell-center">${escapeHTML(linha.horario)}</td>`;
      if (linha.milIndex === 0) iseoHtml += `<td rowspan="${linha.milTotal}" class="cell-center">${escapeHTML(linha.viatura)}</td>`;
      iseoHtml += `<td class="${bordaMil} cell-left">${escapeHTML(linha.militar)}</td>`;
      iseoHtml += `<td class="${bordaMil} cell-center">${escapeHTML(linha.rg)}</td>`;
      iseoHtml += '</tr>';
    });

    if (linhasIseo.length === 0) {
      iseoHtml += '<tr><td colspan="6" style="text-align:center;color:#999;">Nenhum registro</td></tr>';
    }

    iseoHtml += '</tbody></table>';
    document.getElementById('viewSecaoIseo').innerHTML = iseoHtml;
  } else {
    document.getElementById('viewSecaoIseo').innerHTML = '';
  }

  // Audiências
  if (c.mostrar_audiencias && DB.audiencias.length > 0) {
    let audHtml = `<table class="print-table print-table-diaria" style="margin-top:12px;">
      <thead><tr><th colspan="4" style="${headerStyle}">INTIMAÇÕES PARA AUDIÊNCIAS JUDICIAIS</th></tr>
      <tr style="background:#f3f4f6;"><th>Militar</th><th>RG</th><th>Horário</th><th>Local</th></tr></thead><tbody>`;
    DB.audiencias.forEach(a => {
      audHtml += `<tr><td>${escapeHTML(a.militar)}</td><td>${escapeHTML(a.rg)}</td><td>${escapeHTML(a.horario)}</td><td>${escapeHTML(a.local)}</td></tr>`;
    });
    audHtml += '</tbody></table><p style="font-size:10px;font-style:italic;padding:4px;">Obs.: Este não é o meio oficial de intimação.</p>';
    document.getElementById('viewSecaoAudiencias').innerHTML = audHtml;
  } else {
    document.getElementById('viewSecaoAudiencias').innerHTML = '';
  }

  // Observações (TROCAS) - Movido para depois de Audiências
  if (c.observacoes) {
    document.getElementById('viewObservacoes').innerHTML = `
      <div style="margin-top:12px;border:1px solid #000;"><div style="${textBlockHeaderStyle}">TROCAS DE SERVIÇO / DISPENSAS / OBSERVAÇÕES</div>
      <div style="padding:8px;white-space:pre-wrap;">${escapeHTML(c.observacoes)}</div></div>`;
  } else {
    document.getElementById('viewObservacoes').innerHTML = '';
  }

  // Planejamento
  if (c.planejamento) {
    document.getElementById('viewPlanejamento').innerHTML = `
      <div style="margin-top:12px;border:1px solid #000;"><div style="${textBlockHeaderStyle}">PLANEJAMENTO OPERACIONAL</div>
      <div style="padding:8px;white-space:pre-wrap;">${escapeHTML(c.planejamento)}</div></div>`;
  } else {
    document.getElementById('viewPlanejamento').innerHTML = '';
  }

  // Outras Determinações
  if (c.outras_determinacoes) {
    document.getElementById('viewOutrasDeterminacoes').innerHTML = `
      <div style="margin-top:12px;border:1px solid #000;"><div style="${textBlockHeaderStyle}">OUTRAS DETERMINAÇÕES</div>
      <div style="padding:8px;white-space:pre-wrap;">${escapeHTML(c.outras_determinacoes)}</div></div>`;
  } else {
    document.getElementById('viewOutrasDeterminacoes').innerHTML = '';
  }

  // Totais
  if (c.mostrar_totais) {
    document.getElementById('viewSecaoTotais').innerHTML = `
      <table class="print-table print-table-diaria" style="margin-top:12px;">
        <thead><tr><th colspan="4" style="${headerStyle}">TOTAL</th></tr>
        <tr style="background:#f3f4f6;"><th>RECURSOS HUMANOS</th><th>RECURSOS MATERIAIS</th><th>ATESTADOS MÉDICOS</th><th>TOTAL DE OPERAÇÕES</th></tr></thead>
        <tbody><tr style="text-align:center;"><td>${c.total_rh || 0}</td><td>${c.total_rm || 0}</td><td>${c.total_atestados || 0}</td><td>${c.total_operacoes || 0}</td></tr></tbody>
      </table>`;
  } else {
    document.getElementById('viewSecaoTotais').innerHTML = '';
  }

  // Assinatura
  let assHtml = `<p style="margin-bottom:4px;">${escapeHTML(c.assinatura_cidade || '')}, na data da assinatura.</p>
    <div style="display:inline-block;border-top:1px solid #000;padding-top:8px;min-width:250px;">
      <p style="font-weight:bold;">${escapeHTML(c.assinatura_nome || '')}</p>
      <p>${escapeHTML(c.assinatura_posto || '')}${c.assinatura_posto && c.assinatura_funcao ? ' – ' : ''}${escapeHTML(c.assinatura_funcao || '')}</p>
    </div>`;
  document.getElementById('viewAssinatura').innerHTML = assHtml;

  // Rodapé
  if (c.mostrar_rodape) {
    document.getElementById('viewRodape').innerHTML = `
      <p style="font-weight:bold;">${escapeHTML(c.rodape_linha1 || '')}</p>
      <p>${escapeHTML(c.rodape_linha2 || '')}</p>
      <p>${escapeHTML(c.rodape_linha3 || '')}</p>`;
  } else {
    document.getElementById('viewRodape').innerHTML = '';
  }
}

// Calcula rowspans para mesclagem de células
function calcularRowspans(dados, campo) {
  const spans = [];
  let i = 0;
  while (i < dados.length) {
    let count = 1;
    while (i + count < dados.length && dados[i + count][campo] === dados[i][campo]) {
      count++;
    }
    for (let j = 0; j < count; j++) {
      spans.push(j === 0 ? count : 0);
    }
    i += count;
  }
  return spans;
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

// Escala Diária v2.4 - Production Ready

// === IMPORTAÇÃO DA MENSAL ===
async function importarDaMensal() {
  const diaInput = document.getElementById('importarData');
  if (!diaInput.value) return alert('Por favor, selecione uma data para importar.');
  
  // Extrair dia da data (YYYY-MM-DD)
  // Nota: split('-') garante que pegamos o dia literal, sem problemas de timezone
  const parts = diaInput.value.split('-');
  const dia = parseInt(parts[2]);
  
  if (!dia) return alert('Data inválida.');

  if (!confirm(`Deseja importar o efetivo da Escala Mensal para o dia ${dia}?\nIsso adicionará novos registros ao efetivo atual.`)) return;

  isLoading = true;
  try {
    const token = localStorage.getItem('pmes_token');
    const resp = await fetch(`/api/escalas/mensal?unidade_id=${currentUnidadeId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error('Erro ao buscar escala mensal');
    const mensal = await resp.json();

    if (!mensal || !mensal.equipes) {
      alert('Escala mensal não encontrada ou vazia.');
      return;
    }

    processarImportacaoMensal(mensal, dia);

  } catch (err) {
    console.error(err);
    alert('Erro ao importar da mensal: ' + err.message);
  } finally {
    isLoading = false;
  }
}

function processarImportacaoMensal(mensal, dia) {
  const conf = mensal.config || {};
  const mesInicio = conf.mesInicio ?? 0;
  const ano = conf.anoEscala || 2026;
  const diaInicio = conf.diaInicio || 15;
  const diaFimConfig = conf.diaFim || 15;
  const horarios = conf.horarios || { D: '06:00-18:00', N: '18:00-06:00' };

  // Localizar index do dia
  let diaIndex = -1;
  let counter = 0;
  
  // Loop 1
  const ultimoDiaMes1 = new Date(ano, mesInicio + 1, 0).getDate();
  for (let d = diaInicio; d <= ultimoDiaMes1; d++) {
    if (d === dia) { diaIndex = counter; break; }
    counter++;
  }
  
  // Loop 2 (se não achou e considerando mes seguinte)
  if (diaIndex === -1) {
    for (let d = 1; d <= diaFimConfig; d++) {
      if (d === dia) { diaIndex = counter; break; }
      counter++;
    }
  }

  if (diaIndex === -1) {
    alert(`O dia ${dia} não foi encontrado no período configurado da escala mensal.`);
    return;
  }

  // Normalizar Equipes (Array ou Objeto)
  let equipes = [];
  if (Array.isArray(mensal.equipes)) {
    equipes = mensal.equipes;
  } else {
    equipes = Object.keys(mensal.equipes).map(k => ({
      id: k,
      offset: mensal.config[`offset${k}`] ?? 0,
      militares: mensal.equipes[k]
    }));
  }

  // Processar Equipes
  let adicionados = 0;
  equipes.forEach(eq => {
    const offset = eq.offset ?? 0;
    const pos = (diaIndex + offset) % 5;
    let turno = '';
    if (pos === 0) turno = 'D';
    else if (pos === 1) turno = 'N';

    if (turno) {
      const horario = horarios[turno] || (turno === 'D' ? '06:00-18:00' : '18:00-06:00');
      
      // Iterar colunas para pegar militares
      eq.militares.forEach((milId, colIndex) => {
        if (!milId) return;
        
        // Buscar dados do militar
        const militar = (mensal.militares || []).find(m => m.id === milId);
        if (militar) {
          const setor = (mensal.colunas || [])[colIndex] || 'Indefinido';
          
          DB.efetivo.push({
            id: Date.now() + Math.random(),
            tipo: 'EFETIVO',
            modalidade: '', // Não importa modalidade
            setor: setor,
            horario: horario,
            viatura: '', 
            militares: `${militar.posto} ${militar.nome}`,
            rg: militar.rg
          });
          adicionados++;
        }
      });
    }
  });

  if (adicionados > 0) {
    ordenarEfetivo();
    renderEfetivo();
    marcarAlterado();
    alert(`Importação concluída! ${adicionados} militares adicionados.`);
  } else {
    alert('Nenhum militar encontrado escalado para este dia.');
  }
}

function ordenarEfetivo() {
  DB.efetivo.sort((a, b) => {
    // 1. ISEO por último
    if (a.tipo !== b.tipo) return (a.tipo === 'ISEO' ? 1 : -1) - (b.tipo === 'ISEO' ? 1 : -1);

    // 2. Ordem Turno: D (manhã) < N (noite)
    const getInicio = h => parseInt((h || '').split(':')[0]) || 0;
    const inicioA = getInicio(a.horario);
    const inicioB = getInicio(b.horario);
    if (inicioA !== inicioB) return inicioA - inicioB;

    // 3. Setor
    return (a.setor || '').localeCompare(b.setor || '');
  });
}

// Helper para rowspan (se não existir)
function calcularRowspans(lista, campo) {
  const spans = new Array(lista.length).fill(0);
  if (lista.length === 0) return spans;
  
  let currentVal = lista[0][campo];
  let currentStart = 0;
  
  for (let i = 1; i < lista.length; i++) {
    if (lista[i][campo] !== currentVal) {
      spans[currentStart] = i - currentStart;
      currentVal = lista[i][campo];
      currentStart = i;
    }
  }
  spans[currentStart] = lista.length - currentStart;
  return spans;
}

// Export for Testing
if (typeof module !== 'undefined') {
  module.exports = { processarImportacaoMensal, ordenarEfetivo, calcularRowspans, DB };
}