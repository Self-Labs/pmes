/*
  Sistema de Escalas - API Server
  Versão: 1.4 - Security Update
*/

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🚀 API rodando na porta ${PORT}`);
  }
});