-- ==========================================================
-- CHAMBACHAT V2 - ESQUEMA OFICIAL POSTGRESQL
-- PRD & Arquitectura Base para Operarios y People Analytics
-- ==========================================================

-- Extensión para soporte de tipos geométricos y UUID si es requerido
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMERACIÓN DE NIVELES EDUCATIVOS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'educacion_enum') THEN
        CREATE TYPE educacion_enum AS ENUM (
            'Primaria_Incompleta',
            'Secundaria',
            'Preparatoria',
            'Tecnico'
        );
    END IF;
END$$;

-- 2. TABLA DE USUARIOS / OPERARIOS
CREATE TABLE IF NOT EXISTS Users (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    codigo_postal VARCHAR(10),
    municipio VARCHAR(100),
    nivel_educativo educacion_enum NOT NULL DEFAULT 'Secundaria',
    tag_inea BOOLEAN DEFAULT FALSE,
    coordenadas_gps POINT,
    sueldo_actual_o_deseado DECIMAL(10, 2),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Comentarios explicativos
COMMENT ON TABLE Users IS 'Perfiles de operarios de manufactura en Nuevo León';
COMMENT ON COLUMN Users.tag_inea IS 'Indica si el candidato aceptó acompañamiento para acreditar estudios con INEA';

-- 3. TABLA DE VACANTES / OFERTAS LABORALES
CREATE TABLE IF NOT EXISTS Jobs (
    id SERIAL PRIMARY KEY,
    empresa_id INT NOT NULL DEFAULT 1,
    empresa_nombre VARCHAR(255) NOT NULL DEFAULT 'Industria Regiomontana',
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    sueldo_semanal_libre DECIMAL(10,2) NOT NULL,
    turnos_fijos BOOLEAN DEFAULT FALSE,
    apoyo_inea BOOLEAN DEFAULT FALSE,
    transporte_incluido BOOLEAN DEFAULT TRUE,
    municipio VARCHAR(100) NOT NULL,
    latitud_longitud POINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE Jobs IS 'Vacantes operativas ofertadas por empresas manufactureras';
COMMENT ON COLUMN Jobs.apoyo_inea IS 'Indica si la empresa ofrece flexibilidad/aula INEA';

-- 4. TABLA DE HISTÓRICO DE CONTRATACIONES (Data para People Analytics & Predictor)
CREATE TABLE IF NOT EXISTS Hiring_History (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(id) ON DELETE CASCADE,
    job_id INT REFERENCES Jobs(id) ON DELETE CASCADE,
    sueldo_inicial DECIMAL(10,2) NOT NULL,
    tiempo_traslado_min INT NOT NULL,
    turnos_fijos BOOLEAN NOT NULL DEFAULT FALSE,
    apoyo_inea BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_contratacion DATE NOT NULL,
    fecha_baja DATE NULL,
    meses_permanencia DECIMAL(5,2) NOT NULL,
    motivo_baja VARCHAR(255)
);

COMMENT ON TABLE Hiring_History IS 'Registros históricos para entrenar y calibrar el predictor de retención';

-- 5. TABLA DE CONFIGURACIÓN DEL CHATBOT DINÁMICO (Orquestación sin código)
CREATE TABLE IF NOT EXISTS Bot_Flow_Config (
    step_key VARCHAR(50) PRIMARY KEY,
    step_order INT NOT NULL,
    titulo_admin VARCHAR(100) NOT NULL,
    prompt_texto TEXT NOT NULL,
    opciones_json JSONB DEFAULT '[]'::jsonb,
    activo BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices recomendados para optimizar matchmaking por distancia y queries analíticos
CREATE INDEX IF NOT EXISTS idx_users_tag_inea ON Users(tag_inea);
CREATE INDEX IF NOT EXISTS idx_users_municipio ON Users(municipio);
CREATE INDEX IF NOT EXISTS idx_jobs_apoyo_inea ON Jobs(apoyo_inea);
CREATE INDEX IF NOT EXISTS idx_jobs_municipio ON Jobs(municipio);
CREATE INDEX IF NOT EXISTS idx_hiring_history_permanencia ON Hiring_History(meses_permanencia);
