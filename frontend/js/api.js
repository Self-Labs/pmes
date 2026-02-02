/*
  Sistema de Escalas - API Client
  Versão: 2.0 - Security Update (HttpOnly Cookie Auth)
*/

const API_URL = '/api';

// =============================================
// Usuário storage (apenas para cache da UI, não para auth)
// O token agora é gerenciado via HttpOnly Cookie pelo backend
// =============================================
const getUsuario = () => JSON.parse(localStorage.getItem('pmes_usuario') || 'null');
const setUsuario = (usuario) => localStorage.setItem('pmes_usuario', JSON.stringify(usuario));
const removeUsuario = () => localStorage.removeItem('pmes_usuario');

// =============================================
// Fetch wrapper com credentials para enviar cookies automaticamente
// =============================================
async function api(endpoint, options = {}) {
  const config = {
    credentials: 'include', // Envia cookies HttpOnly automaticamente
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);

  // Se token expirou ou inválido, redireciona para login
  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    removeUsuario();
    window.location.href = '/';
    return;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Erro na requisição');
  }

  return data;
}

// =============================================
// Auth
// =============================================

async function login(email, senha) {
  const data = await api('/auth/login', {
    method: 'POST',
    body: { email, senha },
  });
  // Token agora é setado como HttpOnly cookie pelo backend
  // Apenas salvamos o usuário para cache da UI
  setUsuario(data.usuario);
  return data;
}

async function cadastro(nome, email, senha, unidade_id) {
  return api('/auth/cadastro', {
    method: 'POST',
    body: { nome, email, senha, unidade_id },
  });
}

async function logout() {
  try {
    // Chama endpoint para limpar cookie no servidor
    await api('/auth/logout', { method: 'POST' });
  } catch (e) {
    // Ignora erro se já deslogado
  }
  removeUsuario();
  window.location.href = '/';
}

function isLoggedIn() {
  // Verifica se há usuário em cache. A validação real é feita pelo backend via cookie.
  return !!getUsuario();
}

// =============================================
// Unidades
// =============================================

async function listarUnidades() {
  return api('/unidades');
}

// Busca todas (ativas e inativas) para o Admin
async function listarTodasUnidades() {
  return api('/unidades/todas');
}

async function listarUnidadesArvore() {
  return api('/unidades/arvore');
}

async function criarUnidade(dados) {
  return api('/unidades', {
    method: 'POST',
    body: dados,
  });
}

async function atualizarUnidade(id, dados) {
  return api(`/unidades/${id}`, {
    method: 'PUT',
    body: dados,
  });
}

async function removerUnidade(id) {
  return api(`/unidades/${id}`, {
    method: 'DELETE',
  });
}

// =============================================
// Usuários (Admin)
// =============================================

async function listarUsuarios() {
  return api('/usuarios');
}

async function listarUsuariosPendentes() {
  return api('/usuarios/pendentes');
}

// Cria usuário manualmente (Admin)
async function criarUsuarioManual(dados) {
  return api('/usuarios', {
    method: 'POST',
    body: dados,
  });
}

async function aprovarUsuario(id) {
  return api(`/usuarios/${id}/aprovar`, {
    method: 'PATCH',
  });
}

async function alterarRoleUsuario(id, role) {
  return api(`/usuarios/${id}/role`, {
    method: 'PATCH',
    body: { role },
  });
}

async function removerUsuario(id) {
  return api(`/usuarios/${id}`, {
    method: 'DELETE',
  });
}

// =============================================
// Perfil do Usuário
// =============================================

async function buscarMeuPerfil() {
  return api('/usuarios/me');
}

async function atualizarMeuPerfil(dados) {
  return api('/usuarios/me', {
    method: 'PUT',
    body: dados,
  });
}

async function atualizarUsuario(id, dados) {
  return api(`/usuarios/${id}`, {
    method: 'PUT',
    body: dados,
  });
}

// =============================================
// Escalas Mensal
// =============================================

async function buscarEscalaMensal(unidadeId = null) {
  let url = '/escalas/mensal';
  if (unidadeId) url += `?unidade_id=${unidadeId}`;
  return api(url);
}

async function salvarEscalaMensal(dados, unidadeId = null) {
  if (unidadeId) dados.unidade_id = unidadeId;
  return api('/escalas/mensal', {
    method: 'POST',
    body: dados,
  });
}

// =============================================
// Escalas ISEO
// =============================================

async function buscarEscalaISEO(unidadeId = null) {
  let url = '/escalas/iseo';
  if (unidadeId) url += `?unidade_id=${unidadeId}`;
  return api(url);
}

async function salvarEscalaISEO(dados, unidadeId = null) {
  if (unidadeId) dados.unidade_id = unidadeId;
  return api('/escalas/iseo', {
    method: 'POST',
    body: dados,
  });
}

// =============================================
// Escalas Diárias
// =============================================

async function buscarEscalaDiaria(unidadeId) {
  return api(`/diarias?unidade_id=${unidadeId}`);
}

async function salvarEscalaDiaria(dados) {
  return api('/diarias', {
    method: 'POST',
    body: dados,
  });
}