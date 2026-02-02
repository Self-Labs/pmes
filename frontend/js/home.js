/*
  Sistema de Escalas - Home
  Versão: 1.5
*/

if (!initProtectedPage()) throw new Error('Não autenticado');

const usuario = getUsuario();
document.getElementById('nomeUsuario').textContent = usuario.nome;

if (usuario.role === 'admin') {
  document.getElementById('btnAdmin').classList.remove('hidden');
}
