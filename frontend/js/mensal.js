/*
  Sistema de Escalas - Mensal
  Versão: 2.8
*/

// Verifica autenticação inicial
if (!isLoggedIn()) window.location.href = '/';

let currentUnidadeId = null;

// === INICIALIZAÇÃO COM SUPORTE A SUPER ADMIN ===
(async () => {
  try {
    const user = await buscarMeuPerfil(); // Obtém perfil atualizado
    document.getElementById('navbarUser').textContent = `${user.nome} (${user.role})`;
    
    currentUnidadeId = user.unidade_id;

    // Lógica SUPER ADMIN
    if (user.role === 'admin') {
      document.getElementById('adminMenu').classList.remove('hidden');

      const select = document.getElementById('adminUnitSelect');
      select.classList.remove('hidden'); 

      const unidades = await listarTodasUnidades();

      // Lógica de Caminho Completo (Breadcrumb)
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

      // Evento de troca de unidade
      select.addEventListener('change', (e) => {
        currentUnidadeId = e.target.value;
        localStorage.setItem('pmes_admin_last_unit', currentUnidadeId); // Salva a escolha
        carregarDados(); // Recarrega para a nova unidade
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
    coletarConfig();

    // Audit Trail: Captura quem está salvando e a hora
    const user = await buscarMeuPerfil();
    DB.config.ultima_alteracao = new Date().toLocaleString('pt-BR');
    DB.config.alterado_por = user.nome;

    // Atualiza visualmente na hora
    const auditEl = document.getElementById('auditTrail');
    if (auditEl) auditEl.textContent = `Última edição: ${DB.config.ultima_alteracao} por ${DB.config.alterado_por}`;

    // Passa currentUnidadeId para o salvamento
    await salvarEscalaMensal({
      config: DB.config,
      militares: DB.militares,
      colunas: DB.colunas,
      equipes: DB.equipes,
      observacoes: DB.observacoes
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
  militares: [],
  colunas: ['CHEFE DE OPERAÇÕES', 'RELATORISTA', 'DRO 9º BPM', 'DRO 9º BPM', 'DRO 3º BPM', 'DRO 9ª CIA IND', 'DRO 10ª/15ª CIA IND'],
  equipes: [
    { id: 'A', nome: 'Equipe A', offset: 1, militares: [null, null, null, null, null, null, null] },
    { id: 'B', nome: 'Equipe B', offset: 0, militares: [null, null, null, null, null, null, null] },
    { id: 'C', nome: 'Equipe C', offset: 4, militares: [null, null, null, null, null, null, null] },
    { id: 'D', nome: 'Equipe D', offset: 3, militares: [null, null, null, null, null, null, null] },
    { id: 'E', nome: 'Equipe E', offset: 2, militares: [null, null, null, null, null, null, null] }
  ],
  observacoes: []
};

// === Migração de Dados Antigos ===
function migrarEquipes(equipesData) {
  // Se já é array, retorna
  if (Array.isArray(equipesData)) return equipesData;
  
  // Se é objeto antigo, converte para array
  if (typeof equipesData === 'object' && equipesData !== null) {
    return Object.keys(equipesData).map(id => ({
      id,
      nome: `Equipe ${id}`,
      offset: DB.config[`offset${id}`] ?? 0,
      militares: equipesData[id]
    }));
  }
  
  // Se não tem dados válidos, retorna array padrão (A-E)
  return [
    { id: 'A', nome: 'Equipe A', offset: 1, militares: [] },
    { id: 'B', nome: 'Equipe B', offset: 0, militares: [] },
    { id: 'C', nome: 'Equipe C', offset: 4, militares: [] },
    { id: 'D', nome: 'Equipe D', offset: 3, militares: [] },
    { id: 'E', nome: 'Equipe E', offset: 2, militares: [] }
  ];
}

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
  coletarConfig();
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

// === Legenda offset ===
function atualizarLegenda(input, targetId) {
  const val = parseInt(input.value);
  const legenda = document.getElementById(targetId);
  if (isNaN(val)) return;
  if (val === 0) legenda.textContent = "(D)";
  else if (val === 1) legenda.textContent = "(N)";
  else legenda.textContent = "(F)";
}

// === CRUD Militares ===
function adicionarMilitar() {
  let posto = document.getElementById('novoPosto').value;
  if (posto === 'OUTRO') {
    posto = document.getElementById('novoPostoManual').value.trim().toUpperCase();
  }
  const nome = document.getElementById('novoNome').value.trim().toUpperCase();
  const rg = document.getElementById('novoRG').value.trim();
  if (!posto || !nome || !rg) { alert('Preencha todos os campos!'); return; }
  DB.militares.push({ id: Date.now(), posto, nome, rg });
  renderMilitares();
  renderEquipes();
  marcarAlterado();
  document.getElementById('novoPosto').value = '';
  document.getElementById('novoPostoManual').value = '';
  document.getElementById('novoPostoManual').classList.add('hidden');
  document.getElementById('novoNome').value = '';
  document.getElementById('novoRG').value = '';
}

function removerMilitar(id) {
  DB.militares = DB.militares.filter(m => m.id !== id);
  renderMilitares();
  renderEquipes();
  marcarAlterado();
}

// === Edição de Militares (Modal) ===
function editarMilitar(id) {
  const m = DB.militares.find(x => x.id === id);
  if (!m) return;

  const modal = document.createElement('div');
  modal.id = 'modalEditar';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
  
  modal.innerHTML = `
    <div style="background: white; padding: 24px; border-radius: 8px; width: 400px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 16px;">✏️ Editar Militar</h3>
      
      <div style="margin-bottom: 12px;">
        <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">Posto/Graduação</label>
        <input type="text" id="editPosto" class="form-input" value="${m.posto}">
      </div>
      
      <div style="margin-bottom: 12px;">
        <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">Nome de Guerra</label>
        <input type="text" id="editNome" class="form-input" value="${m.nome}">
      </div>

      <div style="margin-bottom: 20px;">
        <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">RG</label>
        <input type="text" id="editRG" class="form-input" value="${m.rg}" maxlength="9" oninput="mascaraRG(this)">
      </div>

      <div style="display: flex; gap: 8px;">
        <button onclick="salvarEdicaoMilitar(${id})" class="btn btn-primary" style="flex: 1;">💾 Salvar</button>
        <button onclick="fecharModal()" class="btn btn-secondary" style="flex: 1;">Cancelar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  document.getElementById('editNome').focus();
}

function salvarEdicaoMilitar(id) {
  const m = DB.militares.find(x => x.id === id);
  if (!m) return;

  const novoPosto = document.getElementById('editPosto').value.trim().toUpperCase();
  const novoNome = document.getElementById('editNome').value.trim().toUpperCase();
  const novoRG = document.getElementById('editRG').value.trim();

  if (!novoPosto || !novoNome || !novoRG) {
    alert('Preencha todos os campos!');
    return;
  }

  m.posto = novoPosto;
  m.nome = novoNome;
  m.rg = novoRG;

  renderMilitares();
  renderEquipes();
  marcarAlterado();
  fecharModal();
}

function fecharModal() {
  const modal = document.getElementById('modalEditar');
  if (modal) modal.remove();
}

function renderMilitares() {
  const ordemPostos = ['CEL', 'TEN CEL', 'MAJ', 'CAP', '1º TEN', '2º TEN', 'ASP', 'ST', '1º SGT', '2º SGT', '3º SGT', 'CB', 'SD'];
  const militaresOrdenados = [...DB.militares].sort((a, b) => {
    const posA = ordemPostos.indexOf(a.posto);
    const posB = ordemPostos.indexOf(b.posto);
    const idxA = posA === -1 ? 999 : posA;
    const idxB = posB === -1 ? 999 : posB;
    if (idxA !== idxB) return idxA - idxB;
    return a.rg.localeCompare(b.rg);
  });

  document.getElementById('listaMilitares').innerHTML = militaresOrdenados.map(m => `
    <tr>
      <td>${escapeHTML(m.posto)}</td>
      <td style="font-weight: 600;">${escapeHTML(m.nome)}</td>
      <td>${escapeHTML(m.rg)}</td>
      <td style="text-align: center;">
        <button onclick="editarMilitar(${m.id})" class="btn-icon" title="Editar">✏️</button>
        <button onclick="removerMilitar(${m.id})" class="btn-icon" title="Remover">🗑️</button>
      </td>
    </tr>
  `).join('');
}

// === Colunas ===
function renderColunas() {
  const container = document.getElementById('colunasContainer');
  container.style.gridTemplateColumns = `repeat(${DB.colunas.length}, 1fr)`;
  container.innerHTML = DB.colunas.map((col, i) => `
    <input type="text" class="form-input col-input" data-col="${i}" value="${escapeHTML(col)}" style="font-size: 12px;">
  `).join('');
}

function adicionarColuna() {
  coletarColunas();
  DB.colunas.push('NOVA COLUNA');
  DB.equipes.forEach(eq => eq.militares.push(null));
  renderColunas();
  renderEquipes();
  marcarAlterado();
}

function removerColuna() {
  if (DB.colunas.length <= 1) { alert('Mínimo 1 coluna!'); return; }
  coletarColunas();
  DB.colunas.pop();
  DB.equipes.forEach(eq => eq.militares.pop());
  renderColunas();
  renderEquipes();
  marcarAlterado();
}

function coletarColunas() {
  document.querySelectorAll('.col-input').forEach(input => {
    DB.colunas[parseInt(input.dataset.col)] = input.value;
  });
}

// === Equipes ===
// Funções CRUD para Equipes
function adicionarEquipe() {
  if (DB.equipes.length >= 10) {
    alert('⚠️ Máximo de 10 equipes atingido!');
    return;
  }
  
  // Gera próximo ID (A-Z)
  const usedIds = new Set(DB.equipes.map(eq => eq.id));
  let novoId = null;
  for (let i = 65; i <= 90; i++) {
    const letra = String.fromCharCode(i);
    if (!usedIds.has(letra)) {
      novoId = letra;
      break;
    }
  }
  if (!novoId) {
    let num = 1;
    while (usedIds.has(`E${num}`)) num++;
    novoId = `E${num}`;
  }
  
  const militares = Array(DB.colunas.length).fill(null);
  DB.equipes.push({ id: novoId, nome: `Equipe ${novoId}`, offset: 0, militares });
  renderEquipes();
  marcarAlterado();
}

function removerEquipe(id) {
  if (DB.equipes.length <= 1) { alert('⚠️ Mínimo de 1 equipe!'); return; }
  if (confirm(`Remover Equipe ${id}?`)) {
    DB.equipes = DB.equipes.filter(eq => eq.id !== id);
    renderEquipes();
    marcarAlterado();
  }
}

function atualizarNomeEquipe(id, nome) {
  const eq = DB.equipes.find(e => e.id === id);
  if (eq) { eq.nome = nome.trim() || `Equipe ${id}`; marcarAlterado(); }
}

function atualizarOffsetEquipe(id, offset) {
  const eq = DB.equipes.find(e => e.id === id);
  if (eq) { 
    eq.offset = parseInt(offset) || 0; 
    marcarAlterado(); 
    renderOffsetsConfig(); // Atualiza labels D/N/F
  }
}

function renderEquipes() {
  const usados = new Set();
  DB.equipes.forEach(eq => {
    eq.militares.forEach(id => { if (id) usados.add(id); });
  });

  const container = document.getElementById('equipesContainer');
  container.innerHTML = `
    <div style="margin-bottom: 16px; padding: 12px; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px;">
      <button onclick="adicionarEquipe()" class="btn btn-primary">Adicionar Equipe</button>
      <span style="font-size: 12px; color: #666; margin-left: 12px;">Total: ${DB.equipes.length} equipe(s)</span>
    </div>
  ` + DB.equipes.map(eq => `
    <div style="padding: 12px; border: 1px solid #ddd; border-radius: 8px; background: #f9fafb; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="width: 32px; height: 32px; background: var(--pm-gold); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">${escapeHTML(eq.id)}</span>
        <input type="text" value="${escapeHTML(eq.nome)}" onchange="atualizarNomeEquipe('${eq.id}', this.value)" class="form-input" style="flex: 1; font-weight: 600;" placeholder="Nome da Equipe">
        
        <button onclick="removerEquipe('${eq.id}')" class="btn-icon" title="Remover Equipe">🗑️</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(${DB.colunas.length}, 1fr); gap: 8px;">
        ${DB.colunas.map((_, i) => {
          const selId = eq.militares[i];
          return `
          <select class="form-select equipe-select" data-equipe="${eq.id}" data-col="${i}" style="font-size: 12px;">
            <option value="">XXX</option>
            ${DB.militares.map(m => {
              const jaUsado = usados.has(m.id) && m.id !== selId;
              return jaUsado ? '' : `<option value="${m.id}" ${selId == m.id ? 'selected' : ''}>${escapeHTML(m.posto)} ${escapeHTML(m.nome)}</option>`;
            }).join('')}
          </select>`;
        }).join('')}
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.equipe-select').forEach(sel => {
    sel.addEventListener('change', e => {
      const equipeId = e.target.dataset.equipe;
      const col = parseInt(e.target.dataset.col);
      const equipe = DB.equipes.find(eq => eq.id === equipeId);
      if (equipe) {
        equipe.militares[col] = e.target.value ? parseInt(e.target.value) : null;
        renderEquipes();
        marcarAlterado();
      }
    });
  });
  
  // Atualiza painel de offsets na Configuração também
  renderOffsetsConfig();
}

// === Observações ===
function renderObservacoes() {
  document.getElementById('observacoesContainer').innerHTML = DB.observacoes.map((obs, i) => `
    <div style="display: flex; gap: 8px; align-items: flex-start;">
      <span style="color: #999; margin-top: 8px;">➢</span>
      <textarea class="form-input obs-input" data-index="${i}" rows="2" style="flex: 1;">${escapeHTML(obs)}</textarea>
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

// === Coletar Config ===
function coletarConfig() {
  const getOffset = (id, def) => {
    const v = parseInt(document.getElementById(id).value);
    return isNaN(v) ? def : v;
  };
  DB.config = {
    mesInicio: parseInt(document.getElementById('mesInicio').value),
    anoEscala: parseInt(document.getElementById('anoEscala').value),
    diaInicio: parseInt(document.getElementById('diaInicio').value),
    diaFim: parseInt(document.getElementById('diaFim').value),
    diaFim: parseInt(document.getElementById('diaFim').value),
    horarios: {
      D: `${document.getElementById('horarioD_ini').value} às ${document.getElementById('horarioD_fim').value}`,
      N: `${document.getElementById('horarioN_ini').value} às ${document.getElementById('horarioN_fim').value}`
    },
    brasaoEsq: DB.config.brasaoEsq || '',
    brasaoDir: DB.config.brasaoDir || '',
    headerLinha1: document.getElementById('headerLinha1').value,
    headerLinha2: document.getElementById('headerLinha2').value,
    headerLinha3: document.getElementById('headerLinha3').value,
    headerLinha4: document.getElementById('headerLinha4').value,
    headerLema: document.getElementById('headerLema').value,
    assinaturaNome: document.getElementById('assinaturaNome').value,
    assinaturaPosto: document.getElementById('assinaturaPosto').value,
    assinaturaInfo: document.getElementById('assinaturaInfo').value,
    footerLema: document.getElementById('footerLema').value,
    footerEndereco1: document.getElementById('footerEndereco1').value,
    footerEndereco2: document.getElementById('footerEndereco2').value,
  };
  coletarColunas();
  coletarObservacoes();
}

// === Carregar Config ===
function carregarConfig() {
  if (!DB.config.headerLinha1) return;
  document.getElementById('mesInicio').value = DB.config.mesInicio || 0;
  document.getElementById('anoEscala').value = DB.config.anoEscala || 2026;
  document.getElementById('diaInicio').value = DB.config.diaInicio || 15;
  document.getElementById('diaFim').value = DB.config.diaFim || 15;
  document.getElementById('diaFim').value = DB.config.diaFim || 15;
  if (DB.config.horarios) {
    const splitTime = (str) => (str || '').includes(' às ') ? str.split(' às ') : [str, ''];
    
    const [dIni, dFim] = splitTime(DB.config.horarios.D || '06:00 às 18:00');
    document.getElementById('horarioD_ini').value = dIni || '06:00';
    document.getElementById('horarioD_fim').value = dFim || '18:00';
    
    const [nIni, nFim] = splitTime(DB.config.horarios.N || '18:00 às 06:00');
    document.getElementById('horarioN_ini').value = nIni || '18:00';
    document.getElementById('horarioN_fim').value = nFim || '06:00';
  }
  
  renderOffsetsConfig(); // Atualiza painel de offsets

  document.getElementById('headerLinha1').value = DB.config.headerLinha1;
  document.getElementById('headerLinha2').value = DB.config.headerLinha2;
  document.getElementById('headerLinha3').value = DB.config.headerLinha3;
  document.getElementById('headerLinha4').value = DB.config.headerLinha4 || '';
  document.getElementById('headerLema').value = DB.config.headerLema;
  document.getElementById('assinaturaNome').value = DB.config.assinaturaNome;
  document.getElementById('assinaturaPosto').value = DB.config.assinaturaPosto;
  document.getElementById('assinaturaInfo').value = DB.config.assinaturaInfo;
  document.getElementById('footerLema').value = DB.config.footerLema || '';
  document.getElementById('footerEndereco1').value = DB.config.footerEndereco1 || '';
  document.getElementById('footerEndereco2').value = DB.config.footerEndereco2 || '';
}

// === Render Offsets na Config ===
function renderOffsetsConfig() {
  const container = document.getElementById('offsetsConfigContainer');
  if (!container) return;
  
  if (DB.equipes.length === 0) {
    container.innerHTML = '<span style="font-size:12px; color:#999;">Nenhuma equipe cadastrada.</span>';
    return;
  }

  container.innerHTML = DB.equipes.map(eq => `
    <div style="display: flex; flex-direction: column; gap: 2px;">
      <label style="font-size: 11px; font-weight: bold; color: #555;">${escapeHTML(eq.nome)}</label>
      <div style="display: flex; align-items: center; gap: 4px;">
        <input type="number" class="form-input" value="${eq.offset}" 
               onchange="atualizarOffsetEquipe('${eq.id}', this.value)" 
               min="0" max="4" style="text-align: center; font-size: 12px;">
        <span style="font-size: 10px; color: #777; width: 15px;">${eq.offset === 0 ? 'D' : eq.offset === 1 ? 'N' : 'F'}</span>
      </div>
    </div>
  `).join('');
}

// Intercepta atualizações de equipe para re-renderizar offsets se necessário
const _originalAdicionar = window.adicionarEquipe;
// Se existir globalmente? Não, está no escopo
// Melhor injetar a chamada dentro das funções adicionar/remover existentes
// ... Mas como não posso editar tudo de uma vez, vou adicionar à função renderEquipes que é chamada nesses casos?
// Sim, renderEquipes é chamada após adicionar/remover. Então vou chamar renderOffsetsConfig DENTRO de renderEquipes também.


// === Carregar Dados do Servidor ===
async function carregarDados() {
  isLoading = true;
  try {
    // Passa currentUnidadeId para buscar a escala da unidade correta (se Admin)
    const dados = await buscarEscalaMensal(currentUnidadeId);
    if (dados) {
      DB.config = dados.config || {};
      DB.militares = dados.militares || [];
      DB.colunas = dados.colunas || DB.colunas;
      DB.config = dados.config || {};
      DB.militares = dados.militares || [];
      DB.colunas = dados.colunas || DB.colunas;
      DB.equipes = migrarEquipes(dados.equipes);
      DB.observacoes = dados.observacoes || [];
    } else {
      // Se não existir escala, mantém o estado padrão (limpo)
      // ou reinicia o DB se necessário.
      // Aqui optamos por manter o DB padrão caso venha null
    }
  } catch (err) {
    console.log('Nenhuma escala salva ainda');
  }
  carregarConfig();
  renderMilitares();
  renderColunas();
  renderEquipes();
  renderObservacoes();

  // Exibe auditoria se existir
  if (DB.config && DB.config.ultima_alteracao) {
    const auditEl = document.getElementById('auditTrail');
    if (auditEl) auditEl.textContent = `Última edição: ${DB.config.ultima_alteracao} por ${DB.config.alterado_por || 'Desconhecido'}`;
  }
  
  setTimeout(() => { isLoading = false; }, 500);
}

// === Renderizar Documento ===
function renderizarDocumento() {
  const c = DB.config;

  // Brasões
  const brasaoEsqHTML = c.brasaoEsq ? `<img src="${c.brasaoEsq}" style="height: 80px; width: auto; object-fit: contain;">` : '<div style="width: 80px; height: 80px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #999;">Brasão</div>';
  const brasaoDirHTML = c.brasaoDir ? `<img src="${c.brasaoDir}" style="height: 80px; width: auto; object-fit: contain;">` : '<div style="width: 80px; height: 80px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #999;">Brasão</div>';

  document.getElementById('brasaoEsqView').innerHTML = brasaoEsqHTML;
  document.getElementById('brasaoDirView').innerHTML = brasaoDirHTML;

  document.getElementById('headerTexto').innerHTML = `
    <p style="font-size: 14px; font-weight: bold; text-transform: uppercase;">${escapeHTML(c.headerLinha1 || 'ESTADO DO ESPÍRITO SANTO')}</p>
    <p style="font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${escapeHTML(c.headerLinha2 || 'POLÍCIA MILITAR')}</p>
    <p style="font-size: 14px; font-weight: bold; text-transform: uppercase;">${escapeHTML(c.headerLinha3 || '3º COMANDO DE POLÍCIA OSTENSIVA REGIONAL')}</p>
    <p style="font-size: 16px; font-weight: bold; text-transform: uppercase;">${escapeHTML(c.headerLinha4 || 'COPOM')}</p>
    <p style="font-size: 14px; font-weight: bold; font-style: italic; margin-top: 4px;">${escapeHTML(c.headerLema || '"Policial Militar, herói protetor da sociedade"')}</p>
  `;

  // Tabela Superior
  const getMilitar = id => DB.militares.find(m => m.id === id);
  const formatMilitar = id => {
    const m = getMilitar(id);
    return m ? `<div style="line-height: 1.2;"><span style="font-weight: bold;">${escapeHTML(m.posto)} ${escapeHTML(m.nome)}</span><br>RG ${escapeHTML(m.rg)}</div>` : 'XXX';
  };

  let html = `
    <colgroup><col style="width:6%;">${DB.colunas.map(() => '<col>').join('')}</colgroup>
    <thead><tr class="bg-pm-gold">
      <th style="height: 32px;"></th>
      ${(() => {
        const headers = [];
        let lastCol = null;
        let span = 0;
        DB.colunas.forEach(col => {
          if (col === lastCol) {
            span++;
          } else {
            if (lastCol) headers.push({ text: lastCol, span });
            lastCol = col;
            span = 1;
          }
        });
        if (lastCol) headers.push({ text: lastCol, span });
        return headers.map(h => `<th colspan="${h.span}" style="height: 32px; font-weight: bold; text-align: center; vertical-align: middle; text-transform: uppercase; border: 1px solid black;">${escapeHTML(h.text)}</th>`).join('');
      })()}
    </tr></thead>
    <tbody style="text-align: center; vertical-align: middle;">
  `;

  DB.equipes.forEach(eq => {
    html += `<tr style="height: 45px;">
      <td style="font-weight: bold; background: #FFD966; vertical-align: middle;">${escapeHTML(eq.id)}</td>
      ${DB.colunas.map((_, i) => `<td style="vertical-align: middle; background: white;">${formatMilitar(eq.militares[i])}</td>`).join('')}
    </tr>`;
  });
  html += '</tbody>';

  const tabFinal = document.getElementById('tabelaFinal');
  tabFinal.className = 'print-table print-table-mensal';
  tabFinal.style.marginBottom = '0';
  tabFinal.innerHTML = html;

  // Calendário
  renderizarCalendario();

  // Observações
  document.getElementById('observacoesTexto').innerHTML = DB.observacoes.filter(o => o.trim()).map(o => `<p style="margin-bottom: 4px; text-align: justify; line-height: 1.3;"><strong>➢</strong> ${escapeHTML(o)}</p>`).join('');

  // Assinatura
  document.getElementById('assinaturaTexto').textContent = `${c.assinaturaNome || 'NOME'} – ${c.assinaturaPosto || 'POSTO/GRAD'}`;
  document.getElementById('assinaturaInfoTexto').textContent = c.assinaturaInfo || '';
  document.getElementById('footerLemaTexto').textContent = c.footerLema || '';
  document.getElementById('footerEnderecoTexto1').textContent = c.footerEndereco1 || '';
  document.getElementById('footerEnderecoTexto2').textContent = c.footerEndereco2 || '';
}

function renderizarCalendario() {
  const mesInicio = DB.config.mesInicio ?? 0;
  const ano = DB.config.anoEscala || 2026;
  const diaInicio = DB.config.diaInicio || 15;
  const diaFim = DB.config.diaFim || 15;

  const meses = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
  const diasSemana = ['D','S','T','Q','Q','S','S'];

  const dias = [];
  const mesFim = (mesInicio + 1) % 12;
  const anoFim = mesFim === 0 ? ano + 1 : ano;

  const ultimoDia1 = new Date(ano, mesInicio + 1, 0).getDate();
  for (let d = diaInicio; d <= ultimoDia1; d++) {
    dias.push({ dia: d, mes: mesInicio, diaSemana: new Date(ano, mesInicio, d).getDay() });
  }
  for (let d = 1; d <= diaFim; d++) {
    dias.push({ dia: d, mes: mesFim, diaSemana: new Date(anoFim, mesFim, d).getDay() });
  }

  /* 
    Lógica de Calendário: 
    Itera dias do diaInicio até fim do mês 1, depois dia 1 até diaFim do mês 2.
  */

  function getTurno(equipe, diaIndex) {
    const pos = (diaIndex + (equipe.offset || 0)) % 5;
    if (pos === 0) return 'D';
    if (pos === 1) return 'N';
    return '';
  }

  const getBg = d => (d.diaSemana === 0 || d.diaSemana === 6) ? 'background-color:#e5e7eb !important;' : '';

// Export for Testing
if (typeof module !== 'undefined') {
  module.exports = { migrarEquipes, getTurno, DB };
}

  const diasMes1 = dias.filter(d => d.mes === mesInicio).length;
  const diasMes2 = dias.filter(d => d.mes === mesFim).length;

  let html = `<colgroup><col style="width:6%;">${dias.map(() => `<col style="width:${94/dias.length}%;">`).join('')}</colgroup>`;

  html += `<tr class="bg-pm-gold" style="font-weight: bold; text-align: center; height: 24px;">
    <td style="border: 1px solid black; padding: 4px;" colspan="${diasMes1+1}">${meses[mesInicio]}</td>
    <td style="border: 1px solid black; padding: 4px;" colspan="${diasMes2}">${meses[mesFim]}</td>
  </tr>`;

  html += `<tr style="font-weight: bold; height: 24px; background-color: #f8d7da;">
    <td style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold;">SEMANA</td>
    ${dias.map(d => `<td style="border: 1px solid black; padding: 4px; text-align: center;">${diasSemana[d.diaSemana]}</td>`).join('')}
  </tr>`;

  html += `<tr style="font-weight: bold; height: 24px; background-color: #d4edda;">
    <td style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold;">DATA</td>
    ${dias.map(d => `<td style="border: 1px solid black; padding: 4px; text-align: center;">${String(d.dia).padStart(2,'0')}</td>`).join('')}
  </tr>`;

  DB.equipes.forEach(eq => {
    html += `<tr style="height: 24px;">
      <td style="border: 1px solid black; padding: 4px; font-weight: bold; background: #FFD966; text-align: center;">${escapeHTML(eq.id)}</td>
      ${dias.map((d, i) => `<td style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold; ${getBg(d)}">${getTurno(eq, i)}</td>`).join('')}
    </tr>`;
  });

  const calDiv = document.getElementById('calendarioFinal');
  calDiv.className = 'print-table print-table-mensal overlap-top';
  calDiv.innerHTML = html;
}

// === Listeners para auto-save ===
document.querySelectorAll('#tab-config input, #tab-config select, #tab-config textarea').forEach(el => {
  el.addEventListener('input', marcarAlterado);
  el.addEventListener('change', marcarAlterado);
});

// Observer para mudanças dinâmicas (colunas, equipes, observações)
const observerCallback = () => marcarAlterado();

const observer = new MutationObserver(observerCallback);
observer.observe(document.getElementById('colunasContainer'), { childList: true, subtree: true });
observer.observe(document.getElementById('equipesContainer'), { childList: true, subtree: true });
observer.observe(document.getElementById('observacoesContainer'), { childList: true, subtree: true });

// === Init ===
console.log('🚀 Escala Mensal v2.7');
