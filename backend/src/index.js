/*
  Sistema de Escalas - API Server
  Versão: 1.3 - Security Update
*/

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const unidadesRoutes = require('./routes/unidades');
const escalasRoutes = require('./routes/escalas');
const diariasRoutes = require('./routes/diarias');

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// SECURITY MIDDLEWARES
// =============================================

// Helmet - Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // Desabilita CSP (configurar depois se necessário)
  crossOriginEmbedderPolicy: false
}));

// Rate Limiting Global (100 requests por 15 minutos)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Rate Limiting para Auth (mais restritivo: 10 tentativas por 15 minutos)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas. Aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar rate limit restritivo nas rotas de auth
app.use('/auth/login', authLimiter);
app.use('/auth/esqueci-senha', authLimiter);
app.use('/auth/cadastro', authLimiter);

// =============================================
// GENERAL MIDDLEWARES
// =============================================

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));

// Rotas
app.use('/auth', authRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/unidades', unidadesRoutes);
app.use('/escalas', escalasRoutes);
app.use('/diarias', diariasRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Erro global
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🚀 API rodando na porta ${PORT}`);
  }
});