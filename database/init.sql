-- =============================================
-- PMES - Schema Inicial
-- =============================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABELA: unidades (hierárquica)
-- =============================================
CREATE TABLE unidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES unidades(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    sigla VARCHAR(20) NOT NULL,
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
INSERT INTO unidades (nome, sigla, tipo) VALUES 
('1º Comando de Polícia Ostensiva Regional', '1º CPOR', 'CPOR'),
('2º Comando de Polícia Ostensiva Regional', '2º CPOR', 'CPOR'),
('3º Comando de Polícia Ostensiva Regional', '3º CPOR', 'CPOR'),
('4º Comando de Polícia Ostensiva Regional', '4º CPOR', 'CPOR'),
('5º Comando de Polícia Ostensiva Regional', '5º CPOR', 'CPOR'),
('6º Comando de Polícia Ostensiva Regional', '6º CPOR', 'CPOR'),
('Comando de Polícia Ostensiva Especializado', 'CPOE', 'CPOE');