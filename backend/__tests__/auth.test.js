/*
  Sistema de Escalas - Tests - auth.test
  Versão: 1.0
*/

const request = require('supertest');
const bcrypt = require('bcryptjs');

// 1. Mock do PostgreSQL (pg)
const mockQuery = jest.fn();
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({ query: mockQuery }))
}));

// 2. Mock do Email
jest.mock('../src/config/email', () => ({
  enviarEmailNovoUsuario: jest.fn(),
  enviarEmailRecuperacaoSenha: jest.fn()
}));

// 3. Setup de variáveis de ambiente
beforeAll(() => {
  process.env.JWT_SECRET = 'test_secret';
  process.env.NODE_ENV = 'test';
});

// Import after mocks
const app = require('../src/app');

describe('Auth Routes', () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  describe('POST /auth/cadastro', () => {
    const userBase = { nome: 'Teste', email: 'test@pmes.com', unidade_id: 1 };

    it('deve rejeitar senha fraca (< 8 characteres)', async () => {
      const res = await request(app).post('/auth/cadastro').send({
        ...userBase, senha: '123'
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/mínimo 8 caracteres/);
    });

    it('deve cadastrar com sucesso se senha forte', async () => {
      // Sequence of queries validation:
      // 1. Check email exists (returns empty)
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // 2. Insert user (returns new user)
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ id: 1, ...userBase, role: 'editor', ativo: false }] 
      });
      // 3. Select unidades (to build hierarchy name)
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ id: 1, sigla: '1BPM', parent_id: null }] 
      });

      const res = await request(app).post('/auth/cadastro').send({
        ...userBase, senha: 'SenhaForte1@'
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBeDefined();
    });
  });

  describe('POST /auth/login', () => {
    it('deve realizar login e definir cookie HttpOnly', async () => {
      const senhaHash = await bcrypt.hash('Senha123@', 10);
      const mockUser = { 
        id: 1, 
        email: 'test@pmes.com', 
        senha: senhaHash, 
        nome: 'Usuario Teste',
        role: 'user',
        unidade_id: 1,
        ativo: true
      };
      
      mockQuery.mockResolvedValue({ rows: [mockUser] });

      const res = await request(app).post('/auth/login').send({
        email: 'test@pmes.com', senha: 'Senha123@'
      });

      expect(res.statusCode).toBe(200);
      
      // Valida Cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/pmes_token=.*?HttpOnly/);
    });
  });
});
