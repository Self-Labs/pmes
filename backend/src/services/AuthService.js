/*
  Sistema de Escalas - AuthService
  Versão: 1.0 - Architecture Refactor
*/

const usuarioRepository = require('../repositories/UsuarioRepository');
const usuarioService = require('./UsuarioService'); // Reusing creation/validation logic if useful
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { enviarEmailNovoUsuario, enviarEmailRecuperacaoSenha } = require('../config/email');
const db = require('../config/db'); // Needed for some direct queries if not covered by Repo? No, try to use repo.

// Helper for strong password
function validarSenhaForte(senha) {
  if (!senha || senha.length < 8) return 'Senha deve ter no mínimo 8 caracteres';
  if (!/[A-Z]/.test(senha)) return 'Senha deve ter pelo menos uma letra maiúscula';
  if (!/[a-z]/.test(senha)) return 'Senha deve ter pelo menos uma letra minúscula';
  if (!/[0-9]/.test(senha)) return 'Senha deve ter pelo menos um número';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha)) return 'Senha deve ter pelo menos um caractere especial';
  return null;
}

class AuthService {
  async login(email, senha) {
    const usuario = await usuarioRepository.findByEmail(email.toLowerCase());
    
    if (!usuario) throw new Error('Credenciais inválidas');
    if (!usuario.ativo) throw new Error('Usuário aguardando aprovação');

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) throw new Error('Credenciais inválidas');

    const token = jwt.sign(
      { 
        id: usuario.id, 
        email: usuario.email, 
        role: usuario.role,
        unidade_id: usuario.unidade_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return { token, usuario };
  }

  async cadastro(dados) {
    const { nome, email, senha, unidade_id } = dados;

    const erroSenha = validarSenhaForte(senha);
    if (erroSenha) throw new Error(erroSenha);

    // Reusing UsuarioService.criar might be better to avoid duplication?
    // But UsuarioService.criar handles hasing inside.
    // Auth route had logic to send email to admin. UsuarioService.criar does NOT.
    // I should probably use `usuarioService.criar` and then send email here.
    
    // Call user service to create (it handles duplicate check and hashing)
    const novoUsuario = await usuarioService.criar({ nome, email, senha, unidade_id });

    // Send email logic (complex logic with tree sigla)
    // I need db access for units tree or add finding units to UnitRepository?
    // UnitRepository has findAll...
    // Let's implement the sigla lookup here or extracting it to a UnitService method would be cleaner.
    // But I'll keep it here for now to avoid circular deps if UnitService imports AuthService (unlikely).
    
    // Quick fix: Use DB query or add method to UnitRepository?
    // Let's rely on DB query for the tree logic for now or simply fetch units.
    // Ideally UnitService should provide `getSiglaHierarquia(id)`.
    
    // For now I'll just use the raw query here to replicate exact behavior, 
    // or better: import UnitRepository.
    
    const { UnidadeRepository } = require('../repositories/UnidadeRepository'); // Dynamic require if needed or top-level?
    // Circular dependency risk? No.
    
    // Replicating logic without complex refactor of Unit logic:
    const unidadesResult = await db.query('SELECT id, sigla, parent_id FROM unidades');
    const unidades = unidadesResult.rows;
    const mapa = new Map(unidades.map(u => [u.id, u]));

    const getCaminho = (id) => {
      const u = mapa.get(id);
      if (!u) return [];
      if (!u.parent_id) return [u.sigla];
      return [...getCaminho(u.parent_id), u.sigla];
    };

    const caminho = getCaminho(unidade_id);
    const unidadeSigla = caminho.length > 0 ? caminho.join(' / ') : null;

    enviarEmailNovoUsuario(novoUsuario, unidadeSigla);

    return novoUsuario;
  }

  async esqueciSenha(email) {
    const usuario = await usuarioRepository.findByEmail(email.toLowerCase());
    
    // Security: don't reveal if user exists
    if (!usuario) return;

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await usuarioRepository.updateResetToken(usuario.id, token, expires);
    await enviarEmailRecuperacaoSenha(email, usuario.nome, token);
  }

  async resetarSenha(token, novaSenha) {
    const erroSenha = validarSenhaForte(novaSenha);
    if (erroSenha) throw new Error(erroSenha);

    // Finds and INVALIDATES token atomically
    const usuario = await usuarioRepository.findByResetToken(token);
    
    if (!usuario) throw new Error('Token inválido ou expirado');

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await usuarioRepository.updatePassword(usuario.id, senhaHash);
  }
}

module.exports = new AuthService();
