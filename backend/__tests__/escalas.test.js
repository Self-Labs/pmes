/*
  Sistema de Escalas - Tests - escalas.test
  Versão: 1.0
*/

const request = require('supertest');

// 1. Mock do PostgreSQL (pg)
// Deve ser feito antes de qualquer require do app
const mockQuery = jest.fn();
jest.mock('pg', () => {
  return {
    Pool: jest.fn(() => ({
      query: mockQuery,
      connect: jest.fn(),
      on: jest.fn()
    }))
  };
});

// 2. Mock do Middleware de Acesso (evita query recursiva complexa)
jest.mock('../src/middleware/access', () => ({
  verificarAcessoUnidade: jest.fn()
}));

// 3. Mock do JWT para simular login
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token) => {
    if (token === 'admin_token') return { id: 1, role: 'admin', unidade_id: 'u1' };
    if (token === 'user_token') return { id: 2, role: 'user', unidade_id: 'u2' };
    throw new Error('Invalid token');
  })
}));

const app = require('../src/app');
const { verificarAcessoUnidade } = require('../src/middleware/access');

describe('Escalas Routes', () => {
  beforeEach(() => {
    mockQuery.mockClear();
    verificarAcessoUnidade.mockClear();
  });

  describe('GET /escalas/mensal', () => {
    it('deve retornar 401 se sem token', async () => {
      const res = await request(app).get('/escalas/mensal');
      expect(res.statusCode).toBe(401);
    });

    it('deve retornar 403 se validação de acesso falhar', async () => {
      verificarAcessoUnidade.mockResolvedValue(false); // Acesso negado

      // Simula cookie HttpOnly
      const res = await request(app)
        .get('/escalas/mensal?unidade_id=u3')
        .set('Cookie', ['pmes_token=admin_token']);

      expect(res.statusCode).toBe(403);
      expect(verificarAcessoUnidade).toHaveBeenCalledWith(1, 'u1', 'admin', 'u3');
    });

    it('deve retornar dados da escala se acesso permitido', async () => {
      verificarAcessoUnidade.mockResolvedValue(true); // Acesso permitido
      mockQuery.mockResolvedValue({ 
        rows: [{ unidade_id: 'u1', config: { title: 'Escala Teste' } }] 
      });

      const res = await request(app)
        .get('/escalas/mensal')
        .set('Cookie', ['pmes_token=admin_token']);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('config');
      // Verifica queries
      // 1ª: Access check (mockado, não chama DB)
      // 2ª: Busca escala
      expect(mockQuery).toHaveBeenCalled();
      expect(mockQuery.mock.calls[0][0]).toContain('SELECT * FROM escalas_mensal');
    });
  });

  describe('POST /escalas/mensal', () => {
    it('deve criar/atualizar escala se autorizado', async () => {
      verificarAcessoUnidade.mockResolvedValue(true);
      mockQuery.mockResolvedValue({ 
        rows: [{ unidade_id: 'u1', updated_at: new Date() }] 
      });

      const res = await request(app)
        .post('/escalas/mensal')
        .set('Cookie', ['pmes_token=admin_token'])
        .send({ 
          unidade_id: 'u1',
          config: { ano: 2026 }
        });

      expect(res.statusCode).toBe(200);
      expect(mockQuery).toHaveBeenCalled();
      // Verifica se usou UPSERT
      expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO escalas_mensal');
      expect(mockQuery.mock.calls[0][0]).toContain('ON CONFLICT');
    });
  });
});
