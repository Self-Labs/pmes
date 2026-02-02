/*
  Sistema de Escalas - Auth Middleware
  Versão: 1.1 - Security Update
*/

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Tenta obter token do cookie HttpOnly (método mais seguro)
  let token = req.cookies?.pmes_token;

  // Fallback para header Authorization (compatibilidade com apps/testes)
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && /^Bearer\s/i.test(authHeader)) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  return next();
};

module.exports = { authMiddleware, adminMiddleware };