/*
  Sistema de Escalas - Schema
  Versão: 1.0.1
*/

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABELA: unidades (hierárquica)
-- =============================================
CREATE TABLE unidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES unidades(id) ON DELETE CASCADE,
    sigla VARCHAR(30) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('CPOR', 'CPOE', 'BPM', 'CIA_IND', 'CIA', 'COPOM', 'PELOTAO', 'OUTRO')),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABELA: usuarios
-- =============================================
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
    unidade_id UUID REFERENCES unidades(id),
    ativo BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABELA: escalas_mensal (1 por unidade - modelo)
-- =============================================
CREATE TABLE escalas_mensal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_id UUID UNIQUE NOT NULL REFERENCES unidades(id),
    config JSONB DEFAULT '{}',
    militares JSONB DEFAULT '[]',
    colunas JSONB DEFAULT '[]',
    equipes JSONB DEFAULT '{}',
    observacoes JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABELA: escalas_iseo (1 por unidade - modelo)
-- =============================================
CREATE TABLE escalas_iseo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_id UUID UNIQUE NOT NULL REFERENCES unidades(id),
    config JSONB DEFAULT '{}',
    dados JSONB DEFAULT '{}',
    militares JSONB DEFAULT '[]',
    observacoes JSONB DEFAULT '[]',
    setor TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX idx_unidades_parent ON unidades(parent_id);
CREATE INDEX idx_unidades_tipo ON unidades(tipo);
CREATE INDEX idx_usuarios_unidade ON usuarios(unidade_id);
CREATE INDEX idx_usuarios_email ON usuarios(email);

-- =============================================
-- DADOS INICIAIS: Comandos Regionais
-- =============================================
INSERT INTO unidades (sigla, tipo) VALUES
('1º CPOR', 'CPOR'),
('2º CPOR', 'CPOR'),
('3º CPOR', 'CPOR'),
('4º CPOR', 'CPOR'),
('5º CPOR', 'CPOR'),
('6º CPOR', 'CPOR'),
('CPOE', 'CPOE');

-- =============================================
-- 1º CPOR - Subunidades
-- =============================================
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '1º BPM', 'BPM' FROM unidades WHERE sigla = '1º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '6º BPM', 'BPM' FROM unidades WHERE sigla = '1º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '12ª Cia Ind', 'CIA_IND' FROM unidades WHERE sigla = '1º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '14ª Cia Ind', 'CIA_IND' FROM unidades WHERE sigla = '1º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, 'COPOM/1º CPOR', 'COPOM' FROM unidades WHERE sigla = '1º CPOR';

-- =============================================
-- 2º CPOR - Subunidades
-- =============================================
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '5º BPM', 'BPM' FROM unidades WHERE sigla = '2º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '12º BPM', 'BPM' FROM unidades WHERE sigla = '2º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '13º BPM', 'BPM' FROM unidades WHERE sigla = '2º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '18ª Cia Ind', 'CIA_IND' FROM unidades WHERE sigla = '2º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, 'COPOM/2º CPOR', 'COPOM' FROM unidades WHERE sigla = '2º CPOR';

-- =============================================
-- 3º CPOR - Subunidades
-- =============================================
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '3º BPM', 'BPM' FROM unidades WHERE sigla = '3º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '9º BPM', 'BPM' FROM unidades WHERE sigla = '3º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '9ª Cia Ind', 'CIA_IND' FROM unidades WHERE sigla = '3º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '10ª Cia Ind', 'CIA_IND' FROM unidades WHERE sigla = '3º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '15ª Cia Ind', 'CIA_IND' FROM unidades WHERE sigla = '3º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, 'COPOM/3º CPOR', 'COPOM' FROM unidades WHERE sigla = '3º CPOR';

-- =============================================
-- 4º CPOR - Subunidades
-- =============================================
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '2º BPM', 'BPM' FROM unidades WHERE sigla = '4º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '8º BPM', 'BPM' FROM unidades WHERE sigla = '4º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '11º BPM', 'BPM' FROM unidades WHERE sigla = '4º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '19ª Cia Ind', 'CIA_IND' FROM unidades WHERE sigla = '4º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, 'COPOM/4º CPOR', 'COPOM' FROM unidades WHERE sigla = '4º CPOR';

-- =============================================
-- 5º CPOR - Subunidades
-- =============================================
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '14º BPM', 'BPM' FROM unidades WHERE sigla = '5º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '2ª Cia Ind', 'CIA_IND' FROM unidades WHERE sigla = '5º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '6ª Cia Ind', 'CIA_IND' FROM unidades WHERE sigla = '5º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '8ª Cia Ind', 'CIA_IND' FROM unidades WHERE sigla = '5º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, 'COPOM/5º CPOR', 'COPOM' FROM unidades WHERE sigla = '5º CPOR';

-- =============================================
-- 6º CPOR - Subunidades
-- =============================================
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '4º BPM', 'BPM' FROM unidades WHERE sigla = '6º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '7º BPM', 'BPM' FROM unidades WHERE sigla = '6º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '10º BPM', 'BPM' FROM unidades WHERE sigla = '6º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '11ª Cia Ind', 'CIA_IND' FROM unidades WHERE sigla = '6º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '13ª Cia Ind', 'CIA_IND' FROM unidades WHERE sigla = '6º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '16ª Cia Ind', 'CIA_IND' FROM unidades WHERE sigla = '6º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, '17ª Cia Ind', 'CIA_IND' FROM unidades WHERE sigla = '6º CPOR';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, 'COPOM/6º CPOR', 'COPOM' FROM unidades WHERE sigla = '6º CPOR';

-- =============================================
-- CPOE - Subunidades
-- =============================================
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, 'BPMA', 'BPM' FROM unidades WHERE sigla = 'CPOE';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, 'BPTran', 'BPM' FROM unidades WHERE sigla = 'CPOE';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, 'BME', 'BPM' FROM unidades WHERE sigla = 'CPOE';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, 'RPMont', 'BPM' FROM unidades WHERE sigla = 'CPOE';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, 'BAC', 'BPM' FROM unidades WHERE sigla = 'CPOE';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, 'CEPE', 'CIA_IND' FROM unidades WHERE sigla = 'CPOE';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, 'CEPG', 'CIA_IND' FROM unidades WHERE sigla = 'CPOE';
INSERT INTO unidades (parent_id, sigla, tipo)
SELECT id, 'COPOM/CPOE', 'COPOM' FROM unidades WHERE sigla = 'CPOE';