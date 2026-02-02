/*
  Sistema de Escalas - Admin
  Versão: 2.8
*/

// Verifica autenticação admin
if (!initAdminPage()) throw new Error('Não autorizado');

let unidadesCache = [];

// === Tabs ===
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// === Pendentes ===
async function carregarPendentes() {
  try {
    const pendentes = await listarUsuariosPendentes();
    const container = document.getElementById('listaPendentes');
    const semPendentes = document.getElementById('semPendentes');

    if (pendentes.length === 0) {
      container.innerHTML = '';
      semPendentes.classList.remove('hidden');
      return;
    }

    semPendentes.classList.add('hidden');
    container.innerHTML = pendentes.map(u => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 8px; background: #fffbeb;">
        <div>
          <p style="font-weight: bold;">${escapeHTML(u.nome)}</p>
          <p style="font-size: 13px; color: #666;">${escapeHTML(u.email)} • ${escapeHTML(u.unidade_sigla || 'Sem unidade')}</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="aprovar('${u.id}')" class="btn btn-success" style="padding: 6px 12px;">✅ Aprovar</button>
          <button onclick="rejeitar('${u.id}')" class="btn btn-danger" style="padding: 6px 12px;">❌ Rejeitar</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar pendentes:', err);
  }
}

async function aprovar(id) {
  try {
    await aprovarUsuario(id);
    alert('✅ Usuário aprovado!');
    carregarPendentes();
    carregarUsuarios();
  } catch (err) {
    alert('❌ Erro: ' + err.message);
  }
}

async function rejeitar(id) {
  if (!confirm('Tem certeza que deseja rejeitar e remover este usuário?')) return;
  try {
    await removerUsuario(id);
    alert('Usuário removido.');
    carregarPendentes();
  } catch (err) {
    alert('❌ Erro: ' + err.message);
  }
}

// === Usuários ===
async function carregarUsuarios() {
  try {
    const usuarios = await listarUsuarios();
    usuariosCache = usuarios;
    document.getElementById('listaUsuarios').innerHTML = usuarios.map(u => {
    // Lógica de Hierarquia Visual (busca por ID para evitar duplicatas como COPOM)
    let nomeUnidade = u.unidade_sigla || '-';
    const unidade = unidadesCache.find(x => x.id === u.unidade_id);
    if (unidade) {
       const getCaminho = (id) => {
         const un = unidadesCache.find(x => x.id === id);
         if (!un) return [];
         if (!un.parent_id) return [un.sigla];
         return [...getCaminho(un.parent_id), un.sigla];
       };
       const caminho = getCaminho(u.unidade_id);
       if (caminho.length > 0) nomeUnidade = caminho.join(' / ');
    }

    return `
    <tr>
      <td style="font-weight: 600;">${escapeHTML(u.nome)}</td>
      <td>${escapeHTML(u.email)}</td>
      <td style="font-size: 13px; color: #4b5563;">${nomeUnidade}</td>
      <td>
        <select onchange="mudarRole('${u.id}', this.value)" class="form-select" style="width: auto; padding: 4px 8px; font-size: 12px;">
          <option value="editor" ${u.role === 'editor' ? 'selected' : ''}>Editor</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
      <td>
        <span style="padding: 2px 8px; border-radius: 4px; font-size: 12px; ${u.ativo ? 'background: #d4edda; color: #155724;' : 'background: #f8d7da; color: #721c24;'}">
          ${u.ativo ? 'Ativo' : 'Pendente'}
        </span>
      </td>
      <td>
        <button onclick="abrirEditarUsuario('${u.id}')" class="btn-icon" title="Editar">✏️</button>
        <button onclick="excluirUsuario('${u.id}', '${u.nome}')" class="btn-icon" title="Excluir">🗑️</button>
      </td>
    </tr>
  `}).join('');
  } catch (err) {
    console.error('Erro ao carregar usuários:', err);
  }
}

async function mudarRole(id, role) {
  try {
    await alterarRoleUsuario(id, role);
  } catch (err) {
    alert('❌ Erro: ' + err.message);
    carregarUsuarios();
  }
}

async function excluirUsuario(id, nome) {
  if (!confirm(`Tem certeza que deseja excluir "${nome}"?`)) return;
  try {
    await removerUsuario(id);
    carregarUsuarios();
  } catch (err) {
    alert('❌ Erro: ' + err.message);
  }
}

// === Unidades ===
async function carregarUnidades() {
  try {
    // Correção Item 2: Busca TODAS (incluindo inativas)
    unidadesCache = await listarTodasUnidades();
    renderUnidades();
    renderSelectParent();
  } catch (err) {
    console.error('Erro ao carregar unidades:', err);
  }
}

// Nova Lógica Recursiva de Árvore
function montarArvore(lista) {
  const mapa = {};
  const raizes = [];
  
  // 1. Cria mapa de referências
  lista.forEach(u => mapa[u.id] = { ...u, children: [] });

  // 2. Conecta pais e filhos
  lista.forEach(u => {
    if (u.parent_id && mapa[u.parent_id]) {
      mapa[u.parent_id].children.push(mapa[u.id]);
    } else {
      raizes.push(mapa[u.id]);
    }
  });
  
  // 3. Ordena recursivamente por Sigla
  const ordenar = (nos) => {
    nos.sort((a, b) => a.sigla.localeCompare(b.sigla));
    nos.forEach(no => ordenar(no.children));
  };
  ordenar(raizes);

  return raizes;
}

function renderUnidades() {
  const arvore = montarArvore(unidadesCache);
  let html = '';

  const renderLinha = (u, nivel) => {
    const padding = nivel * 24; 
    const isRaiz = nivel === 0;

    // Classes do CSS
    const rowClass = isRaiz ? 'unit-row-root' : 'unit-row-child';
    const siglaClass = isRaiz ? 'unit-sigla-root' : 'unit-sigla-child';

    // Ícone hierárquico
    let icone = '';
    if (nivel > 0) icone = `<span style="color:#9ca3af; margin-right:4px;">↳</span>`;
    else if (u.children.length > 0) icone = `<span style="margin-right:4px;">🏢</span>`;

    // Badge de Status (Classe CSS)
    const inativoTag = !u.ativo ? '<span class="unit-inactive">(Inativo)</span>' : '';

    // Cor do Badge por Tipo
    let badgeClass = 'badge-secondary';
    if (u.tipo === 'CPOR' || u.tipo === 'CPOE') badgeClass = 'badge-primary';
    else if (u.tipo === 'BPM') badgeClass = 'badge-success';
    else if (u.tipo === 'CIA' || u.tipo === 'CIA_IND') badgeClass = 'badge-warning';
    else if (u.tipo === 'COPOM') badgeClass = 'badge-danger';

    // O padding-left continua inline pois é cálculo matemático dinâmico
    let row = `
      <tr class="${rowClass}">
        <td class="${siglaClass}" style="padding-left: ${padding + 12}px;">
          ${icone} ${escapeHTML(u.sigla)} ${inativoTag}
        </td>
        <td><span class="badge ${badgeClass}">${escapeHTML(u.tipo.replace('_', ' '))}</span></td>
        <td class="text-right">
          <button onclick="abrirEditarUnidade('${u.id}')" class="btn-icon" title="Editar">✏️</button>
          <button onclick="excluirUnidade('${u.id}', '${u.sigla}')" class="btn-icon" title="Excluir">🗑️</button>
        </td>
      </tr>
    `;

    u.children.forEach(filho => { row += renderLinha(filho, nivel + 1); });
    return row;
  };

  arvore.forEach(raiz => { html += renderLinha(raiz, 0); });
  document.getElementById('listaUnidades').innerHTML = html;
}

function renderSelectParent() {
  const select = document.getElementById('novoParent');
  select.innerHTML = '<option value="">Nenhuma (raiz)</option>' + gerarOpcoesRecursivas();
}

function gerarOpcoesRecursivas(ignorarId = null) {
  const arvore = montarArvore(unidadesCache);
  let html = '';

  const renderOpt = (u, nivel) => {
    if (u.id === ignorarId) return '';

    const prefixo = '&nbsp;&nbsp;'.repeat(nivel) + (nivel > 0 ? '↳ ' : '');
    let opt = `<option value="${u.id}">${prefixo}${u.sigla}</option>`;

    u.children.forEach(filho => { opt += renderOpt(filho, nivel + 1); });
    return opt;
  };

  arvore.forEach(raiz => { html += renderOpt(raiz, 0); });
  return html;
}

async function criarNovaUnidade() {
  const sigla = document.getElementById('novaSigla').value.trim();
  const tipo = document.getElementById('novoTipo').value;
  const parent_id = document.getElementById('novoParent').value || null;

  if (!sigla || !tipo) {
    alert('Preencha Sigla e Tipo!');
    return;
  }

  try {
    await criarUnidade({ sigla, tipo, parent_id });
    document.getElementById('novaSigla').value = '';
    document.getElementById('novoTipo').value = '';
    document.getElementById('novoParent').value = '';
    carregarUnidades();
  } catch (err) {
    alert('❌ Erro: ' + err.message);
  }
}

async function excluirUnidade(id, sigla) {
  if (!confirm(`Tem certeza que deseja excluir "${sigla}"? Subunidades também serão removidas.`)) return;
  try {
    await removerUnidade(id);
    carregarUnidades();
  } catch (err) {
    alert('❌ Erro: ' + err.message);
  }
}

// === Lógica de Selects em Cascata (Novo Usuário) ===
function carregarUnidadesPrincipaisNew() {
  const parentId = document.getElementById('newUserComando').value;
  const select = document.getElementById('newUserUnidade');
  const selectSub = document.getElementById('newUserSubunidade');

  select.innerHTML = '<option value="">Selecione a unidade (Opcional)</option>';
  selectSub.innerHTML = '<option value="">Selecione a subunidade (Opcional)</option>';
  selectSub.disabled = true;

  if (!parentId) return;

  const filhas = unidadesCache.filter(u => u.parent_id == parentId);
  filhas.sort((a,b) => a.sigla.localeCompare(b.sigla));
  filhas.forEach(u => select.appendChild(new Option(u.sigla, u.id)));
}

function carregarSubunidadesNew() {
  const parentId = document.getElementById('newUserUnidade').value;
  const select = document.getElementById('newUserSubunidade');

  select.innerHTML = '<option value="">Selecione a subunidade (Opcional)</option>';

  if (!parentId) {
    select.disabled = true;
    return;
  }

  const netas = unidadesCache.filter(u => u.parent_id == parentId);
  netas.sort((a,b) => a.sigla.localeCompare(b.sigla));
  netas.forEach(u => select.appendChild(new Option(u.sigla, u.id)));
  select.disabled = false;
}

// === Lógica de Selects em Cascata (Editar Usuário) ===
function carregarUnidadesPrincipaisEdit() {
  const parentId = document.getElementById('editUserComando').value;
  const select = document.getElementById('editUserUnidade');
  const selectSub = document.getElementById('editUserSubunidade');

  select.innerHTML = '<option value="">Selecione a unidade (Opcional)</option>';
  selectSub.innerHTML = '<option value="">Selecione a subunidade (Opcional)</option>';
  selectSub.disabled = true;

  if (!parentId) return;

  const filhas = unidadesCache.filter(u => u.parent_id == parentId);
  filhas.sort((a,b) => a.sigla.localeCompare(b.sigla));
  filhas.forEach(u => select.appendChild(new Option(u.sigla, u.id)));
}

function carregarSubunidadesEdit() {
  const parentId = document.getElementById('editUserUnidade').value;
  const select = document.getElementById('editUserSubunidade');

  select.innerHTML = '<option value="">Selecione a subunidade (Opcional)</option>';

  if (!parentId) {
    select.disabled = true;
    return;
  }

  const netas = unidadesCache.filter(u => u.parent_id == parentId);
  netas.sort((a,b) => a.sigla.localeCompare(b.sigla));
  netas.forEach(u => select.appendChild(new Option(u.sigla, u.id)));
  select.disabled = false;
}

// === Modal Editar Usuário (Lógica Reverso) ===
async function abrirEditarUsuario(id) {
  const usuario = usuariosCache.find(u => u.id === id);
  if (!usuario) return;

  document.getElementById('editUserId').value = usuario.id;
  document.getElementById('editUserNome').value = usuario.nome;
  document.getElementById('editUserEmail').value = usuario.email;
  document.getElementById('editUserRole').value = usuario.role;
  document.getElementById('editUserAtivo').value = usuario.ativo.toString();

  // 1. Popula Comandos Regionais
  const selCmd = document.getElementById('editUserComando');
  selCmd.innerHTML = '<option value="">Selecione...</option>';
  const raizes = unidadesCache.filter(u => !u.parent_id);
  raizes.sort((a,b) => a.sigla.localeCompare(b.sigla));
  raizes.forEach(u => selCmd.appendChild(new Option(u.sigla, u.id)));

  // 2. Tenta descobrir a hierarquia do usuário para preencher os selects
  const selUni = document.getElementById('editUserUnidade');
  const selSub = document.getElementById('editUserSubunidade');

  // Reseta os filhos
  selUni.innerHTML = '<option value="">Selecione a unidade (Opcional)</option>';
  selSub.innerHTML = '<option value="">Selecione a subunidade (Opcional)</option>';
  selSub.disabled = true;

  // Busca a unidade atual do usuário (por ID para evitar duplicatas como COPOM)
  let unidadeAlvo = unidadesCache.find(u => u.id === usuario.unidade_id);

  if (unidadeAlvo) {
    // Reconstrói o caminho até a raiz (Subunidade -> Unidade -> Comando)
    const path = [unidadeAlvo];
    let curr = unidadeAlvo;
    while(curr.parent_id) {
      curr = unidadesCache.find(u => u.id === curr.parent_id);
      if(curr) path.unshift(curr);
      else break;
    }

    // path[0] = Comando, path[1] = Unidade, path[2] = Subunidade
    if (path[0]) {
      selCmd.value = path[0].id;
      carregarUnidadesPrincipaisEdit(); // Carrega o nível 2
    }

    if (path[1]) {
      selUni.value = path[1].id;
      carregarSubunidadesEdit(); // Carrega o nível 3
    }

    if (path[2]) {
      selSub.value = path[2].id;
    }
  }

  document.getElementById('modalEditarUsuario').classList.remove('hidden');
}

function fecharModalUsuario() {
  document.getElementById('modalEditarUsuario').classList.add('hidden');
}

async function salvarUsuario() {
  const id = document.getElementById('editUserId').value;
  
  // Lógica de Prioridade: Subunidade > Unidade > Comando Regional
  const unidadeFinal = document.getElementById('editUserSubunidade').value || document.getElementById('editUserUnidade').value || document.getElementById('editUserComando').value;

  const dados = {
    nome: document.getElementById('editUserNome').value,
    email: document.getElementById('editUserEmail').value,
    role: document.getElementById('editUserRole').value,
    unidade_id: unidadeFinal || null,
    ativo: document.getElementById('editUserAtivo').value === 'true'
  };

  try {
    await atualizarUsuario(id, dados);
    fecharModalUsuario();
    carregarUsuarios();
    alert('✅ Usuário atualizado!');
  } catch (err) {
    alert('❌ Erro: ' + err.message);
  }
}

// === Modal Editar Unidade ===
function abrirEditarUnidade(id) {
  const unidade = unidadesCache.find(u => u.id === id);
  if (!unidade) return;

  document.getElementById('editUnidadeId').value = unidade.id;
  document.getElementById('editUnidadeSigla').value = unidade.sigla;
  document.getElementById('editUnidadeTipo').value = unidade.tipo;
  document.getElementById('editUnidadeAtivo').value = unidade.ativo.toString();

  // Popula select de parent (excluindo a própria unidade)
  const selectParent = document.getElementById('editUnidadeParent');
  selectParent.innerHTML = '<option value="">Nenhuma (raiz)</option>' + gerarOpcoesRecursivas(id);

  if (unidade.parent_id) {
    selectParent.value = unidade.parent_id;
  }

  document.getElementById('modalEditarUnidade').classList.remove('hidden');
}

function fecharModalUnidade() {
  document.getElementById('modalEditarUnidade').classList.add('hidden');
}

async function salvarUnidade() {
  const id = document.getElementById('editUnidadeId').value;
  const dados = {
    sigla: document.getElementById('editUnidadeSigla').value,
    tipo: document.getElementById('editUnidadeTipo').value,
    parent_id: document.getElementById('editUnidadeParent').value || null,
    ativo: document.getElementById('editUnidadeAtivo').value === 'true'
  };

  try {
    await atualizarUnidade(id, dados);
    fecharModalUnidade();
    carregarUnidades();
    alert('✅ Unidade atualizada!');
  } catch (err) {
    alert('❌ Erro: ' + err.message);
  }
}

// === Modal Criar Usuário (Inicialização) ===
function abrirCriarUsuario() {
  // Limpa campos
  document.getElementById('newUserNome').value = '';
  document.getElementById('newUserEmail').value = '';
  document.getElementById('newUserSenha').value = '';
  document.getElementById('newUserRole').value = 'editor';
  document.getElementById('newUserAtivo').value = 'true';

  // Popula comandos (Unidades Raiz)
  const selectComando = document.getElementById('newUserComando');
  selectComando.innerHTML = '<option value="">Selecione...</option>';

  const principais = unidadesCache.filter(u => !u.parent_id);
  principais.sort((a,b) => a.sigla.localeCompare(b.sigla));
  principais.forEach(u => {
    selectComando.appendChild(new Option(u.sigla, u.id));
  });

  document.getElementById('newUserUnidade').innerHTML = '<option value="">Selecione a unidade primeiro</option>';
  document.getElementById('newUserSubunidade').innerHTML = '<option value="">Selecione a unidade primeiro</option>';
  document.getElementById('newUserSubunidade').disabled = true;

  document.getElementById('modalCriarUsuario').classList.remove('hidden');
}

function fecharModalCriarUsuario() {
  document.getElementById('modalCriarUsuario').classList.add('hidden');
}

async function salvarNovoUsuario() {
  const unidadeFinal = document.getElementById('newUserSubunidade').value || document.getElementById('newUserUnidade').value || document.getElementById('newUserComando').value;

  const dados = {
    nome: document.getElementById('newUserNome').value,
    email: document.getElementById('newUserEmail').value,
    senha: document.getElementById('newUserSenha').value,
    role: document.getElementById('newUserRole').value,
    unidade_id: unidadeFinal || null,
    ativo: document.getElementById('newUserAtivo').value === 'true'
  };

  if (!dados.nome || !dados.email || !dados.senha) {
    alert('Preencha nome, email e senha!');
    return;
  }

  try {
    await criarUsuarioManual(dados);
    fecharModalCriarUsuario();
    carregarUsuarios();
    alert('✅ Usuário criado com sucesso!');
  } catch (err) {
    alert('❌ Erro: ' + err.message);
  }
}

// === Init ===
async function inicializar() {
  await carregarUnidades();
  carregarPendentes();
  carregarUsuarios();
}

inicializar();
console.log('🚀 Admin v2.7');
