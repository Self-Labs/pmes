// =============================================
// PMES - API Client
// =============================================

const API_URL = '/api';

// Token storage
const getToken = () => localStorage.getItem('pmes_token');
const setToken = (token) => localStorage.setItem('pmes_token', token);
const removeToken = () => localStorage.removeItem('pmes_token');

// Usuário storage
const getUsuario = () => JSON.parse(localStorage.getItem('pmes_usuario') || 'null');
const setUsuario = (usuario) => localStorage.setItem('pmes_usuario', JSON.stringify(usuario));
const removeUsuario = () => localStorage.removeItem('pmes_usuario');

// Fetch wrapper
async function api(endpoint, options = {}) {
  const token = getToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (response.status === 401) {
    removeToken();
    removeUsuario();
    window.location.href = '/index.html';
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
  setToken(data.token);
  setUsuario(data.usuario);
  return data;
}

async function cadastro(nome, email, senha, unidade_id) {
  return api('/auth/cadastro', {
    method: 'POST',
    body: { nome, email, senha, unidade_id },
  });
}

function logout() {
  removeToken();
  removeUsuario();
  window.location.href = '/index.html';
}

function isLoggedIn() {
  return !!getToken();
}

// =============================================
// Unidades
// =============================================

async function listarUnidades() {
  return api('/unidades');
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
// Escalas Mensal
// =============================================

async function listarEscalasMensal() {
  return api('/escalas/mensal');
}

async function buscarEscalaMensal(ano, mes) {
  return api(`/escalas/mensal/${ano}/${mes}`);
}

async function salvarEscalaMensal(dados) {
  return api('/escalas/mensal', {
    method: 'POST',
    body: dados,
  });
}

async function removerEscalaMensal(ano, mes) {
  return api(`/escalas/mensal/${ano}/${mes}`, {
    method: 'DELETE',
  });
}

// =============================================
// Escalas ISEO
// =============================================

async function listarEscalasISEO() {
  return api('/escalas/iseo');
}

async function buscarEscalaISEO(data) {
  return api(`/escalas/iseo/${data}`);
}

async function salvarEscalaISEO(dados) {
  return api('/escalas/iseo', {
    method: 'POST',
    body: dados,
  });
}

async function removerEscalaISEO(data) {
  return api(`/escalas/iseo/${data}`, {
    method: 'DELETE',
  });
}