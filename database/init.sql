/*
  Sistema de Escalas - Schema
  Versão: 1.6
*/

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABELA: unidades (hierárquica)
-- =============================================
CREATE TABLE IF NOT EXISTS unidades (
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
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
    unidade_id UUID REFERENCES unidades(id),
    ativo BOOLEAN DEFAULT false,
    reset_token VARCHAR(64),
    reset_token_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABELA: escalas_mensal (1 por unidade)
-- =============================================
CREATE TABLE IF NOT EXISTS escalas_mensal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_id UUID UNIQUE NOT NULL REFERENCES unidades(id),
    config JSONB DEFAULT '{}',
    militares JSONB DEFAULT '[]',
    colunas JSONB DEFAULT '[]',
    equipes JSONB DEFAULT '{}',
    observacoes JSONB DEFAULT '[]',
    -- Campos de Auditoria
    ultima_alteracao TIMESTAMP,
    alterado_por VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABELA: escalas_iseo (1 por unidade)
-- =============================================
CREATE TABLE IF NOT EXISTS escalas_iseo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_id UUID UNIQUE NOT NULL REFERENCES unidades(id),
    config JSONB DEFAULT '{}',
    dados JSONB DEFAULT '{}',
    militares JSONB DEFAULT '[]',
    observacoes JSONB DEFAULT '[]',
    setor TEXT,
    -- Campos de Auditoria
    ultima_alteracao TIMESTAMP,
    alterado_por VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABELA: escalas_diarias (1 por unidade)
-- =============================================
CREATE TABLE IF NOT EXISTS escalas_diarias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    unidade_id UUID UNIQUE NOT NULL REFERENCES unidades(id),
    data_servico DATE,
    
    -- Configurações de seções visíveis
    mostrar_iseo BOOLEAN DEFAULT false,
    mostrar_audiencias BOOLEAN DEFAULT false,
    mostrar_totais BOOLEAN DEFAULT false,
    mostrar_rodape BOOLEAN DEFAULT true,
    
    -- Cabeçalho
    cabecalho_linha1 VARCHAR(255) DEFAULT 'ESTADO DO ESPÍRITO SANTO',
    cabecalho_linha2 VARCHAR(255) DEFAULT 'POLÍCIA MILITAR',
    cabecalho_linha3 VARCHAR(255),
    cabecalho_linha4 VARCHAR(255),
    lema VARCHAR(255) DEFAULT 'Policial Militar, herói protetor da sociedade',
    titulo_escala VARCHAR(255) DEFAULT 'ESCALA DIÁRIA',
    subtitulo VARCHAR(255),
    
    -- Brasões (base64)
    brasao_esquerdo TEXT,
    brasao_direito TEXT,
    
    -- Textos das seções
    observacoes TEXT,
    planejamento TEXT,
    outras_determinacoes TEXT,
    
    -- Totais
    total_rh INTEGER DEFAULT 0,
    total_rm INTEGER DEFAULT 0,
    total_atestados INTEGER DEFAULT 0,
    total_operacoes INTEGER DEFAULT 0,
    
    -- Assinatura
    assinatura_nome VARCHAR(255),
    assinatura_posto VARCHAR(255),
    assinatura_funcao VARCHAR(255),
    assinatura_cidade VARCHAR(255),
    
    -- Rodapé
    rodape_linha1 VARCHAR(255),
    rodape_linha2 VARCHAR(255),
    rodape_linha3 VARCHAR(255),
    
    -- Metadados
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABELA: escalas_diarias_efetivo
-- =============================================
CREATE TABLE IF NOT EXISTS escalas_diarias_efetivo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escala_id UUID NOT NULL REFERENCES escalas_diarias(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL DEFAULT 'EFETIVO',
    ordem INTEGER DEFAULT 0,
    
    modalidade VARCHAR(100),
    setor VARCHAR(255),
    horario VARCHAR(100),
    viatura VARCHAR(50),
    militares TEXT,
    rg TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABELA: escalas_diarias_audiencias
-- =============================================
CREATE TABLE IF NOT EXISTS escalas_diarias_audiencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escala_id UUID NOT NULL REFERENCES escalas_diarias(id) ON DELETE CASCADE,
    ordem INTEGER DEFAULT 0,
    
    militar VARCHAR(100),
    rg VARCHAR(20),
    horario VARCHAR(50),
    local VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_unidades_parent ON unidades(parent_id);
CREATE INDEX IF NOT EXISTS idx_unidades_tipo ON unidades(tipo);
CREATE INDEX IF NOT EXISTS idx_usuarios_unidade ON usuarios(unidade_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_escalas_diarias_unidade ON escalas_diarias(unidade_id);
CREATE INDEX IF NOT EXISTS idx_escalas_diarias_efetivo_escala ON escalas_diarias_efetivo(escala_id);
CREATE INDEX IF NOT EXISTS idx_escalas_diarias_audiencias_escala ON escalas_diarias_audiencias(escala_id);

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
('CPOE', 'CPOE')
ON CONFLICT DO NOTHING;

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
SELECT id, 'COPOM', 'COPOM' FROM unidades WHERE sigla = '1º CPOR';

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
SELECT id, 'COPOM', 'COPOM' FROM unidades WHERE sigla = '2º CPOR';

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
SELECT id, 'COPOM', 'COPOM' FROM unidades WHERE sigla = '3º CPOR';

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
SELECT id, 'COPOM', 'COPOM' FROM unidades WHERE sigla = '4º CPOR';

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
SELECT id, 'COPOM', 'COPOM' FROM unidades WHERE sigla = '5º CPOR';

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
SELECT id, 'COPOM', 'COPOM' FROM unidades WHERE sigla = '6º CPOR';

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
SELECT id, 'COPOM', 'COPOM' FROM unidades WHERE sigla = 'CPOE';