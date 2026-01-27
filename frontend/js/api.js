/*
  Sistema de Escalas - API Client
  Versão: 1.0.6
*/

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

  // Ignora redirect se for login (deixa o try/catch do login lidar com erro de senha)
  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    removeToken();
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
  window.location.href = '/';
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