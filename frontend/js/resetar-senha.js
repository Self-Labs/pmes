/*
  Sistema de Escalas - Resetar Senha
  Versão: 1.2
*/

const API_URL = '/api';

// Pega token da URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (!token) {
  document.getElementById('alertBox').className = 'alert alert-error';
  document.getElementById('alertBox').textContent = '❌ Link inválido. Solicite uma nova recuperação.';
  document.getElementById('resetarForm').style.display = 'none';
}

document.getElementById('resetarForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btn = document.getElementById('btnSalvar');
  const alertBox = document.getElementById('alertBox');
  const senha = document.getElementById('senha').value;
  const senhaConfirma = document.getElementById('senhaConfirma').value;

  if (senha !== senhaConfirma) {
    alertBox.className = 'alert alert-error';
    alertBox.textContent = 'As senhas não coincidem!';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '⏳ Salvando...';
  alertBox.className = 'hidden';

  try {
    const response = await fetch(`${API_URL}/auth/resetar-senha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, senha })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao resetar senha');
    }

    alertBox.className = 'alert alert-success';
    alertBox.innerHTML = '✅ Senha alterada com sucesso!<br>Redirecionando para o login...';
    document.getElementById('resetarForm').style.display = 'none';

    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  } catch (err) {
    alertBox.className = 'alert alert-error';
    alertBox.textContent = err.message;
    btn.disabled = false;
    btn.textContent = '💾 Salvar Nova Senha';
  }
});
