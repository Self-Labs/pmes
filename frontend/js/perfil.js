/*
  Sistema de Escalas - Perfil
  Versão: 1.6
*/

if (!initProtectedPage()) throw new Error('Não autenticado');

const alertBox = document.getElementById('alertBox');

// Carrega dados do perfil
async function carregarPerfil() {
  try {
    const perfil = await buscarMeuPerfil();
    document.getElementById('nome').value = perfil.nome;
    document.getElementById('email').value = perfil.email;

    // Monta caminho hierárquico completo
    let nomeUnidade = perfil.unidade_sigla || 'Não definida';
    if (perfil.unidade_id) {
      try {
        const unidades = await listarTodasUnidades();
        const mapa = new Map(unidades.map(u => [u.id, u]));

        const getCaminho = (id) => {
          const u = mapa.get(id);
          if (!u) return [];
          if (!u.parent_id) return [u.sigla];
          return [...getCaminho(u.parent_id), u.sigla];
        };

        const caminho = getCaminho(perfil.unidade_id);
        if (caminho.length > 0) nomeUnidade = caminho.join(' / ');
      } catch (e) {
        console.log('Erro ao buscar hierarquia:', e);
      }
    }

    document.getElementById('unidade').value = nomeUnidade;
  } catch (err) {
    alertBox.className = 'alert alert-error';
    alertBox.textContent = 'Erro ao carregar perfil: ' + err.message;
  }
}

// Salvar dados
document.getElementById('perfilForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnSalvar');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading"></span>';
  alertBox.className = 'hidden';

  try {
    const dados = {
      nome: document.getElementById('nome').value,
      email: document.getElementById('email').value,
    };
    await atualizarMeuPerfil(dados);

    // Atualiza localStorage
    const usuario = getUsuario();
    usuario.nome = dados.nome;
    usuario.email = dados.email;
    setUsuario(usuario);

    alertBox.className = 'alert alert-success';
    alertBox.textContent = '✅ Dados atualizados com sucesso!';
  } catch (err) {
    alertBox.className = 'alert alert-error';
    alertBox.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Salvar Alterações';
  }
});

// Alterar senha
document.getElementById('senhaForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnSenha');
  const senhaNova = document.getElementById('senhaNova').value;
  const senhaConfirma = document.getElementById('senhaConfirma').value;

  if (senhaNova !== senhaConfirma) {
    alertBox.className = 'alert alert-error';
    alertBox.textContent = 'As senhas não coincidem!';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="loading"></span>';
  alertBox.className = 'hidden';

  try {
    await atualizarMeuPerfil({
      senhaAtual: document.getElementById('senhaAtual').value,
      senhaNova: senhaNova,
    });

    alertBox.className = 'alert alert-success';
    alertBox.textContent = '✅ Senha alterada com sucesso!';
    document.getElementById('senhaForm').reset();
  } catch (err) {
    alertBox.className = 'alert alert-error';
    alertBox.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = '🔑 Alterar Senha';
  }
});

carregarPerfil();
