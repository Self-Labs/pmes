/*
  Sistema de Escalas - ISEO
  Versão: 3.2
*/

// Verifica autenticação
if (!isLoggedIn()) window.location.href = '/';

let currentUnidadeId = null;

// === INICIALIZAÇÃO COM SUPORTE A SUPER ADMIN ===
(async () => {
  try {
    const user = await buscarMeuPerfil();
    document.getElementById('navbarUser').textContent = `${user.nome} (${user.role})`;
    
    currentUnidadeId = user.unidade_id;

    // Lógica SUPER ADMIN
    if (user.role === 'admin') {
      document.getElementById('adminMenu').classList.remove('hidden');

      const select = document.getElementById('adminUnitSelect');
      select.classList.remove('hidden'); 

      const unidades = await listarTodasUnidades();

      // Lógica de Caminho Completo
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

      // Prioridade: 1. localStorage | 2. Unidade do Perfil | 3. Primeira da lista
      const savedUnitId = localStorage.getItem('pmes_admin_last_unit');
      
      if (savedUnitId && unidades.some(u => u.id === savedUnitId)) {
        currentUnidadeId = savedUnitId;
      } else {
        currentUnidadeId = user.unidade_id || (unidades.length > 0 ? unidades[0].id : null);
      }
      
      if (currentUnidadeId) select.value = currentUnidadeId;

      select.addEventListener('change', (e) => {
        currentUnidadeId = e.target.value;
        localStorage.setItem('pmes_admin_last_unit', currentUnidadeId); // Salva a escolha
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

// === Auto-save ===
let autoSaveTimer = null;
let dadosAlterados = false;
let isLoading = true;

function marcarAlterado() {
  if (isLoading) return;

  dadosAlterados = true;
  atualizarStatus('pendente');

  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    salvarAgora();
  }, 3000);
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

    // Audit Trail
    const user = await buscarMeuPerfil();
    DB.config.ultima_alteracao = new Date().toLocaleString('pt-BR');
    DB.config.alterado_por = user.nome;

    // Atualiza visualmente na hora
    const auditEl = document.getElementById('auditTrail');
    if (auditEl) auditEl.textContent = `Última edição: ${DB.config.ultima_alteracao} por ${DB.config.alterado_por}`;

    await salvarEscalaISEO({
      config: DB.config,
      dados: DB.dados,
      militares: DB.militares,
      observacoes: DB.observacoes,
      setor: DB.setor
    }, currentUnidadeId);

    dadosAlterados = false;
    atualizarStatus('salvo');
  } catch (err) {
    atualizarStatus('erro');
    console.error('Erro ao salvar:', err);
  }
}

// === Estado Global ===
const DB = {
  config: {},
  dados: {},
  militares: [],
  observacoes: [],
  setor: ''
};

// === Tabs ===
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// === Edição/Visualização ===
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

// === Máscara RG ===
function mascaraRG(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.length > 6) v = v.slice(0, 6);
  let formatted = '';
  if (v.length > 0) formatted = v.slice(0, 2);
  if (v.length > 2) formatted += '.' + v.slice(2, 5);
  if (v.length > 5) formatted += '-' + v.slice(5, 6);
  input.value = formatted;
}

// === Toggle posto manual ===
function togglePostoManual() {
  const sel = document.getElementById('novoPosto');
  const manual = document.getElementById('novoPostoManual');
  manual.classList.toggle('hidden', sel.value !== 'OUTRO');
}

// === Brasões ===
function carregarBrasao(lado) {
  const input = document.getElementById(lado === 'esq' ? 'brasaoEsqFile' : 'brasaoDirFile');
  const file = input.files[0];
  if (!file) return;

  // Limite de 1MB por imagem
  if (file.size > 1024 * 1024) {
    alert('⚠️ Imagem muito grande! Máximo 1MB.\nUse uma imagem menor ou comprima antes de enviar.');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    if (lado === 'esq') DB.config.brasaoEsq = e.target.result;
    else DB.config.brasaoDir = e.target.result;
    marcarAlterado();
  };
  reader.readAsDataURL(file);
}

// === Dia da Semana ===
function atualizarDiaSemana() {
  const input = document.getElementById('dataEscala');
  const diaSemanaEl = document.getElementById('diaSemana');
  if (!input.value) { diaSemanaEl.value = ''; return; }
  const dias = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
  const data = new Date(input.value + 'T12:00:00');
  diaSemanaEl.value = dias[data.getDay()];
}

// === CRUD Militares ===
function adicionarMilitar() {
  let posto = document.getElementById('novoPosto').value;
  if (posto === 'OUTRO') {
    posto = document.getElementById('novoPostoManual').value.trim().toUpperCase();
  }
  const quadro = document.getElementById('novoQuadro').value;
  const nome = document.getElementById('novoNome').value.trim().toUpperCase();
  const nomeGuerra = document.getElementById('novoNomeGuerra').value.trim().toUpperCase();
  const rg = document.getElementById('novoRG').value.trim();
  const nf = document.getElementById('novoNF').value.trim();

  if (!posto || !nome || !rg) { alert('Preencha Posto, Nome e RG!'); return; }

  DB.militares.push({ id: Date.now(), posto, quadro, nome, nomeGuerra, rg, nf });
  renderMilitares();
  marcarAlterado();

  // Limpar campos
  document.getElementById('novoPosto').value = '';
  document.getElementById('novoPostoManual').value = '';
  document.getElementById('novoPostoManual').classList.add('hidden');
  document.getElementById('novoQuadro').value = '';
  document.getElementById('novoNome').value = '';
  document.getElementById('novoNomeGuerra').value = '';
  document.getElementById('novoRG').value = '';
  document.getElementById('novoNF').value = '';
}

function removerMilitar(id) {
  DB.militares = DB.militares.filter(m => m.id !== id);
  renderMilitares();
  marcarAlterado();
}

function moverMilitar(id, direcao) {
  const idx = DB.militares.findIndex(m => m.id === id);
  if (idx === -1) return;
  const novoIdx = idx + direcao;
  if (novoIdx < 0 || novoIdx >= DB.militares.length) return;
  [DB.militares[idx], DB.militares[novoIdx]] = [DB.militares[novoIdx], DB.militares[idx]];
  renderMilitares();
  marcarAlterado();
}

function renderMilitares() {
  document.getElementById('listaMilitares').innerHTML = DB.militares.map((m, i) => {
    let nomeExibir = escapeHTML(m.nome);
    if (m.nomeGuerra) {
      nomeExibir = escapeHTML(m.nome).replace(new RegExp(`(${escapeHTML(m.nomeGuerra)})`, 'i'), '<strong>$1</strong>');
    }
    return `
    <tr>
      <td style="text-align: center; color: #999;">${i + 1}</td>
      <td>${escapeHTML(m.posto)}</td>
      <td>${escapeHTML(m.quadro) || '-'}</td>
      <td>${nomeExibir}</td>
      <td>${escapeHTML(m.rg)}</td>
      <td>${escapeHTML(m.nf) || '-'}</td>
      <td style="text-align: center;">
        <button onclick="moverMilitar(${m.id}, -1)" class="btn-icon" title="Mover para cima">⬆️</button>
        <button onclick="moverMilitar(${m.id}, 1)" class="btn-icon" title="Mover para baixo">⬇️</button>
        <button onclick="removerMilitar(${m.id})" class="btn-icon" title="Remover">🗑️</button>
      </td>
    </tr>
  `}).join('');
}

// === Observações ===
function renderObservacoes() {
  document.getElementById('observacoesContainer').innerHTML = DB.observacoes.map((obs, i) => `
    <div style="display: flex; gap: 8px; align-items: flex-start;">
      <span style="color: #666; font-weight: bold; margin-top: 8px; min-width: 50px;">Obs ${i + 1}:</span>
      <textarea class="form-input obs-input" data-index="${i}" rows="3" style="flex: 1; white-space: pre-wrap;">${escapeHTML(obs)}</textarea>
      <button onclick="removerObservacao(${i})" class="btn-icon" title="Remover">🗑️</button>
    </div>
  `).join('');
}

function adicionarObservacao() {
  coletarObservacoes();
  DB.observacoes.push('');
  renderObservacoes();
  marcarAlterado();
}

function removerObservacao(index) {
  coletarObservacoes();
  DB.observacoes.splice(index, 1);
  renderObservacoes();
  marcarAlterado();
}

function coletarObservacoes() {
  DB.observacoes = [];
  document.querySelectorAll('.obs-input').forEach(input => {
    DB.observacoes.push(input.value);
  });
}

// === Coletar Tudo ===
function coletarTudo() {
  DB.config = {
    brasaoEsq: DB.config.brasaoEsq || '',
    brasaoDir: DB.config.brasaoDir || '',
    headerLinha1: document.getElementById('headerLinha1').value,
    headerLinha2: document.getElementById('headerLinha2').value,
    headerLinha3: document.getElementById('headerLinha3').value,
    headerLema: document.getElementById('headerLema').value,
    assinaturaNome: document.getElementById('assinaturaNome').value,
    assinaturaPosto: document.getElementById('assinaturaPosto').value,
    assinaturaCargo: document.getElementById('assinaturaCargo').value,
    footerLema: document.getElementById('footerLema').value,
    footerLinha1: document.getElementById('footerLinha1').value,
    footerLinha2: document.getElementById('footerLinha2').value,
    footerLinha3: document.getElementById('footerLinha3').value,
  };

  DB.dados = {
    dataEscala: document.getElementById('dataEscala').value,
    diaSemana: document.getElementById('diaSemana').value,
    nomeOperacao: document.getElementById('nomeOperacao').value,
    rubricaISEO: document.getElementById('rubricaISEO').value,
    horarioInicio: document.getElementById('horarioInicio').value,
    horarioFim: document.getElementById('horarioFim').value,
    horarioApresentacao: document.getElementById('horarioApresentacao').value,
    localApresentacao: document.getElementById('localApresentacao').value,
  };

  DB.setor = document.getElementById('setorObs').value;
  coletarObservacoes();
}

// === Carregar Dados ===
function carregarDadosUI() {
  if (DB.config.headerLinha1) {
    document.getElementById('headerLinha1').value = DB.config.headerLinha1;
    document.getElementById('headerLinha2').value = DB.config.headerLinha2;
    document.getElementById('headerLinha3').value = DB.config.headerLinha3;
    document.getElementById('headerLema').value = DB.config.headerLema || '';
    document.getElementById('assinaturaNome').value = DB.config.assinaturaNome || '';
    document.getElementById('assinaturaPosto').value = DB.config.assinaturaPosto || '';
    document.getElementById('assinaturaCargo').value = DB.config.assinaturaCargo || '';
    document.getElementById('footerLema').value = DB.config.footerLema || '';
    document.getElementById('footerLinha1').value = DB.config.footerLinha1 || '';
    document.getElementById('footerLinha2').value = DB.config.footerLinha2 || '';
    document.getElementById('footerLinha3').value = DB.config.footerLinha3 || '';
  }

  if (DB.dados.dataEscala) {
    document.getElementById('dataEscala').value = DB.dados.dataEscala;
    document.getElementById('diaSemana').value = DB.dados.diaSemana || '';
    document.getElementById('nomeOperacao').value = DB.dados.nomeOperacao || '';
    document.getElementById('rubricaISEO').value = DB.dados.rubricaISEO || '';
    document.getElementById('horarioInicio').value = DB.dados.horarioInicio || '';
    document.getElementById('horarioFim').value = DB.dados.horarioFim || '';
    document.getElementById('horarioApresentacao').value = DB.dados.horarioApresentacao || '';
    document.getElementById('localApresentacao').value = DB.dados.localApresentacao || '';
  }

  document.getElementById('setorObs').value = DB.setor || '';
  renderMilitares();
  renderObservacoes();

  // Exibe auditoria se existir
  if (DB.config && DB.config.ultima_alteracao) {
    const auditEl = document.getElementById('auditTrail');
    if (auditEl) auditEl.textContent = `Última edição: ${DB.config.ultima_alteracao} por ${DB.config.alterado_por || 'Desconhecido'}`;
  }
}

// === Carregar Dados do Servidor ===
async function carregarDados() {
  isLoading = true;
  try {
    // Passa currentUnidadeId
    const dados = await buscarEscalaISEO(currentUnidadeId);
    if (dados) {
      DB.config = dados.config || {};
      DB.dados = dados.dados || {};
      DB.militares = dados.militares || [];
      DB.observacoes = dados.observacoes || [];
      DB.setor = dados.setor || '';
    }
  } catch (err) {
    console.log('Nenhuma escala ISEO salva ainda');
  }
  carregarDadosUI();
  setTimeout(() => { isLoading = false; }, 500);
}

// === Renderizar Documento ===
function renderizarDocumento() {
  const c = DB.config;
  const d = DB.dados;

  // Brasões
  const brasaoEsqHTML = c.brasaoEsq 
    ? `<img src="${c.brasaoEsq}" style="height: 70px; width: auto;">` 
    : '<div style="width: 70px; height: 70px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999;">Brasão</div>';
  const brasaoDirHTML = c.brasaoDir 
    ? `<img src="${c.brasaoDir}" style="height: 70px; width: auto;">` 
    : '<div style="width: 70px; height: 70px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999;">Brasão</div>';

  document.getElementById('brasaoEsqView').innerHTML = brasaoEsqHTML;
  document.getElementById('brasaoDirView').innerHTML = brasaoDirHTML;

  // Cabeçalho
  document.getElementById('headerTexto').innerHTML = `
    <p style="font-size: 13px; font-weight: bold; text-transform: uppercase;">${escapeHTML(c.headerLinha1 || '')}</p>
    <p style="font-size: 18px; font-weight: bold; text-transform: uppercase;">${escapeHTML(c.headerLinha2 || '')}</p>
    <p style="font-size: 13px; font-weight: bold; text-transform: uppercase;">${escapeHTML(c.headerLinha3 || '')}</p>
    <p style="font-size: 12px; font-style: italic;">${escapeHTML(c.headerLema || '')}</p>
  `;

  // Título
  document.getElementById('tituloOperacao').textContent = d.nomeOperacao || 'OPERAÇÃO';
  document.getElementById('subtituloISEO').textContent = d.rubricaISEO || '';

  // Info
  const dataFormatada = d.dataEscala ? d.dataEscala.split('-').reverse().join('/') : '';
  document.getElementById('viewDia').textContent = dataFormatada;
  document.getElementById('viewDiaSemana').textContent = d.diaSemana || '';

  // Formatar horários
  const formatarHora = (h) => h ? h.replace(':', 'h') + 'min' : '';
  const horarioEscala = d.horarioInicio && d.horarioFim ? `${formatarHora(d.horarioInicio)} às ${formatarHora(d.horarioFim)}` : '';
  const horarioApres = d.horarioApresentacao ? `${formatarHora(d.horarioApresentacao)}${d.localApresentacao ? ' - ' + d.localApresentacao : ''}` : '';

  document.getElementById('viewHorario').textContent = horarioEscala;
  document.getElementById('viewApresentacao').textContent = horarioApres;

  // Tabela Militares
  let html = `
    <thead>
      <tr style="background: #e5e7eb;">
        <th style="text-align: center; width: 30px;">Nº</th>
        <th style="text-align: left;">MILITAR ESTADUAL</th>
        <th style="text-align: center; width: 120px;">RG</th>
        <th style="text-align: center; width: 120px;">NF</th>
      </tr>
    </thead>
    <tbody>
  `;

  DB.militares.forEach((m, i) => {
    const postoQuadro = m.quadro ? `${escapeHTML(m.posto)} ${escapeHTML(m.quadro)}` : escapeHTML(m.posto);
    // Destaca nome de guerra em negrito, ou nome completo se não tiver
    let nomeExibir = escapeHTML(m.nome);
    if (m.nomeGuerra) {
      nomeExibir = escapeHTML(m.nome).replace(new RegExp(`(${escapeHTML(m.nomeGuerra)})`, 'i'), '<strong>$1</strong>');
    }
    html += `
      <tr>
        <td style="text-align: center;">${String(i + 1).padStart(2, '0')}</td>
        <td>${postoQuadro} ${nomeExibir}</td>
        <td style="text-align: center; white-space: nowrap;">${escapeHTML(m.rg)}</td>
        <td style="text-align: center; white-space: nowrap;">${escapeHTML(m.nf) || '-'}</td>
      </tr>
    `;
  });

  html += '</tbody>';
  document.getElementById('tabelaMilitares').innerHTML = html;

  // Observações
  let obsHtml = '';
  if (DB.setor) {
    obsHtml += `<p style="font-weight: bold; margin-bottom: 8px;">Setor: ${escapeHTML(DB.setor)}</p>`;
  }
  DB.observacoes.filter(o => o.trim()).forEach((o, i) => {
    obsHtml += `<p style="margin-bottom: 4px; white-space: pre-wrap;"><strong>Obs ${i + 1}:</strong> ${escapeHTML(o)}</p>`;
  });
  document.getElementById('observacoesView').innerHTML = obsHtml;

  // Assinatura
  document.getElementById('assinaturaTexto').textContent = `${c.assinaturaNome || ''} – ${c.assinaturaPosto || ''}`;
  document.getElementById('assinaturaCargoTexto').textContent = c.assinaturaCargo || '';

  // Rodapé
  document.getElementById('footerLemaTexto').textContent = c.footerLema || '';
  document.getElementById('footerLinha1Texto').textContent = c.footerLinha1 || '';
  document.getElementById('footerLinha2Texto').textContent = c.footerLinha2 || '';
  document.getElementById('footerLinha3Texto').textContent = c.footerLinha3 || '';
}

// === Listeners para auto-save ===
document.querySelectorAll('#tab-config input, #tab-config select, #tab-config textarea').forEach(el => {
  el.addEventListener('input', marcarAlterado);
  el.addEventListener('change', marcarAlterado);
});

document.querySelectorAll('#tab-dados input, #tab-dados select').forEach(el => {
  el.addEventListener('input', marcarAlterado);
  el.addEventListener('change', marcarAlterado);
});

document.getElementById('setorObs').addEventListener('input', marcarAlterado);

// Observer para mudanças dinâmicas (observações)
const observer = new MutationObserver(() => marcarAlterado());
observer.observe(document.getElementById('observacoesContainer'), { childList: true, subtree: true });

// === Init ===
console.log('🚀 Escala ISEO v3.1');
