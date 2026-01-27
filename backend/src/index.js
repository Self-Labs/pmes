/*
  Sistema de Escalas - API Server
  Versão: 1.0
*/

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const unidadesRoutes = require('./routes/unidades');
const escalasRoutes = require('./routes/escalas');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use('/auth', authRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/unidades', unidadesRoutes);
app.use('/escalas', escalasRoutes);

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
  console.log(`🚀 API rodando na porta ${PORT}`);
});