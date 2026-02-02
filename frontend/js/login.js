/*
  Sistema de Escalas - Login
  Versão: 1.4
*/

// Redireciona se já logado
redirectIfLogged();

// Form submit
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const btn = document.getElementById('btnLogin');
  const alertBox = document.getElementById('alertBox');
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;

  btn.disabled = true;
  btn.innerHTML = '<span class="loading"></span>';
  alertBox.className = 'hidden';

  try {
    await login(email, senha);
    window.location.href = '/home';
  } catch (err) {
    alertBox.className = 'alert alert-error';
    alertBox.textContent = err.message;
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});
