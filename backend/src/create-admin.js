const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function criarAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const senha = process.env.ADMIN_SENHA;
  const nome = process.env.ADMIN_NOME;

  if (!email || !senha || !nome) {
    console.log('❌ Variáveis obrigatórias não definidas!');
    console.log('Defina no .env:');
    console.log('  ADMIN_EMAIL');
    console.log('  ADMIN_SENHA');
    console.log('  ADMIN_NOME');
    process.exit(1);
  }

  try {
    const existe = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    
    if (existe.rows.length > 0) {
      console.log('⚠️ Admin já existe com este email.');
      process.exit(0);
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    
    await db.query(
      `INSERT INTO usuarios (email, senha, nome, role, ativo)
       VALUES ($1, $2, $3, 'admin', true)`,
      [email, senhaHash, nome]
    );

    console.log('✅ Admin criado com sucesso!');
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }

  process.exit(0);
}

criarAdmin();