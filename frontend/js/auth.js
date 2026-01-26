/*
  Sistema de Escalas - Auth Helper
  Versão: 1.0.0
*/

// Verifica se usuário está logado, senão redireciona
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/index.html';
    return false;
  }
  return true;
}

// Verifica se usuário é admin
function requireAdmin() {
  const usuario = getUsuario();
  if (!usuario || usuario.role !== 'admin') {
    window.location.href = '/mensal.html';
    return false;
  }
  return true;
}

// Redireciona se já logado (para página de login)
function redirectIfLogged() {
  if (isLoggedIn()) {
    window.location.href = '/mensal.html';
    return true;
  }
  return false;
}

// Renderiza info do usuário na navbar
function renderUserInfo() {
  const usuario = getUsuario();
  const userEl = document.getElementById('navbarUser');
  
  if (userEl && usuario) {
    userEl.textContent = `${usuario.nome} (${usuario.role})`;
  }
}

// Renderiza menu baseado na role
function renderMenu() {
  const usuario = getUsuario();
  const adminMenu = document.getElementById('adminMenu');
  
  if (adminMenu && usuario && usuario.role === 'admin') {
    adminMenu.classList.remove('hidden');
  }
}

// Inicializa página protegida
function initProtectedPage() {
  if (!requireAuth()) return false;
  document.body.classList.remove('auth-loading');
  renderUserInfo();
  renderMenu();
  return true;
}

// Inicializa página admin
function initAdminPage() {
  if (!requireAuth()) return false;
  if (!requireAdmin()) return false;
  document.body.classList.remove('auth-loading');
  renderUserInfo();
  renderMenu();
  return true;
}