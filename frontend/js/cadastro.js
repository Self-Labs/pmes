/*
  Sistema de Escalas - Cadastro
  Versão: 1.6
*/

// Redireciona se já logado
redirectIfLogged();

let todasUnidades = [];

// 1. Carrega Comandos Regionais (Unidades Raiz)
async function carregarComandos() {
  try {
    todasUnidades = await listarUnidades();
    const select = document.getElementById('comando');

    // Filtra unidades que não possuem unidade superior (Raízes)
    const principais = todasUnidades.filter(u => !u.parent_id);
    principais.sort((a,b) => a.sigla.localeCompare(b.sigla));

    principais.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = u.sigla;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Erro ao carregar comandos:', err);
  }
}

// 2. Carrega Unidades Principais (Nível 2 - Subordinadas ao Comando)
function carregarUnidadesPrincipais() {
  const comandoId = document.getElementById('comando').value;
  const selectUnidade = document.getElementById('unidade');
  const selectSub = document.getElementById('subunidade');

  // Reset
  selectUnidade.innerHTML = '<option value="">Selecione a unidade (Opcional)</option>';
  selectSub.innerHTML = '<option value="">Selecione a subunidade (Opcional)</option>';
  selectSub.disabled = true;

  if (!comandoId) {
    selectUnidade.disabled = true;
    return;
  }

  // Filtra unidades subordinadas ao Comando selecionado
  const nivel2 = todasUnidades.filter(u => u.parent_id === comandoId);
  nivel2.sort((a,b) => a.sigla.localeCompare(b.sigla));

  nivel2.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.sigla;
    selectUnidade.appendChild(opt);
  });

  selectUnidade.disabled = false;
}

// 3. Carrega Subunidades (Nível 3 - Subordinadas à Unidade Principal)
function carregarSubunidades() {
  const unidadeId = document.getElementById('unidade').value;
  const selectSub = document.getElementById('subunidade');

  selectSub.innerHTML = '<option value="">Selecione a subunidade (Opcional)</option>';

  if (!unidadeId) {
    selectSub.disabled = true;
    return;
  }

  // Filtra subunidades subordinadas à Unidade Principal selecionada
  const nivel3 = todasUnidades.filter(u => u.parent_id === unidadeId);
  nivel3.sort((a,b) => a.sigla.localeCompare(b.sigla));

  nivel3.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.sigla;
    selectSub.appendChild(opt);
  });

  selectSub.disabled = false;
}

carregarComandos();

// Form Submit
document.getElementById('cadastroForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const btn = document.getElementById('btnCadastro');
  const alertBox = document.getElementById('alertBox');
  const nome = document.getElementById('nome').value;
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;

  // Lógica de Prioridade: Subunidade > Unidade Principal > Comando Regional
  const unidade_id = document.getElementById('subunidade').value || document.getElementById('unidade').value || document.getElementById('comando').value;

  btn.disabled = true;
  btn.innerHTML = '<span class="loading"></span>';
  alertBox.className = 'hidden';

  try {
    await cadastro(nome, email, senha, unidade_id);
    document.getElementById('cadastroForm').classList.add('hidden');
    alertBox.className = 'alert alert-success';
    alertBox.innerHTML = '✅ Cadastro realizado!<br>Aguarde aprovação do administrador.<br><br>Redirecionando para login em <strong id="contador">5</strong>s...';

    let seg = 5;
    const interval = setInterval(() => {
      seg--;
      document.getElementById('contador').textContent = seg;
      if (seg <= 0) {
        clearInterval(interval);
        window.location.href = '/';
      }
    }, 1000);
  } catch (err) {
    alertBox.className = 'alert alert-error';
    alertBox.textContent = err.message;
    btn.disabled = false;
    btn.textContent = 'Cadastrar';
  }
});
