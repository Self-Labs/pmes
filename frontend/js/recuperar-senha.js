/*
  Sistema de Escalas - Recuperar Senha
  Versão: 1.2
*/

const API_URL = '/api';

document.getElementById('recuperarForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btn = document.getElementById('btnEnviar');
  const alertBox = document.getElementById('alertBox');
  const email = document.getElementById('email').value;

  btn.disabled = true;
  btn.innerHTML = '⏳ Enviando...';
  alertBox.className = 'hidden';

  try {
    const response = await fetch(`${API_URL}/auth/esqueci-senha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao enviar');
    }

    alertBox.className = 'alert alert-success';
    alertBox.innerHTML = '✅ Se o email estiver cadastrado, você receberá as instruções em breve.<br><small>Verifique também a caixa de spam.</small>';
    document.getElementById('recuperarForm').reset();
  } catch (err) {
    alertBox.className = 'alert alert-error';
    alertBox.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = '📧 Enviar Link';
  }
});
