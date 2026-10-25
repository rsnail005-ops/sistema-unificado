-- ==============================================================================
-- ESQUEMA MAESTRO CONSOLIDADO Y OPTIMIZADO PARA SUPABASE
-- APLICACIÓN NACIONAL DE ALMACENAMIENTO DE DATOS Y CONSOLIDACIÓN TERRITORIAL
-- MOVIMIENTO POR LA PAZ Y LA VIDA - REPÚBLICA BOLIVARIANA DE VENEZUELA
-- Servidor / Proyecto: jrjkuzjpabfaburppgtb (https://jrjkuzjpabfaburppgtb.supabase.co)
-- Entidades: usuarios (perfiles), registros, asistencias, pagos, app_releases, audit_log
-- Cumplimiento estricto: supabase-postgres-best-practices
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONES
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. TABLA: perfiles (Usuarios del Sistema: Operadores, Coordinadores, Admins)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    nombres VARCHAR(120) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    telefono VARCHAR(30) DEFAULT '',
    rol VARCHAR(50) NOT NULL DEFAULT 'operador_base', -- 'developer', 'superadmin_nacional', 'coordinador_estadal', 'operador_base', 'operador_municipal'
    estado_asignado VARCHAR(100) NOT NULL DEFAULT 'Distrito Capital',
    municipio_asignado VARCHAR(100) DEFAULT '',
    parroquia_asignada VARCHAR(100) DEFAULT '',
    base_misiones_nombre VARCHAR(150) DEFAULT '',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. TABLA: registros (Personas, Beneficiarios, Eventos, Documentos, Reportes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(50) NOT NULL DEFAULT 'persona', -- 'persona', 'evento', 'documento', 'reporte'
    datos JSONB NOT NULL DEFAULT '{}'::jsonb,
    documentos JSONB NOT NULL DEFAULT '[]'::jsonb,
    ubicacion JSONB NOT NULL DEFAULT '{"estado": "", "municipio": "", "parroquia": ""}'::jsonb,
    creado_por VARCHAR(50) NOT NULL DEFAULT 'operador', -- Cédula del operador responsable
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sincronizado BOOLEAN NOT NULL DEFAULT TRUE,
    hlc_timestamp VARCHAR(64) NOT NULL DEFAULT '',
    version INT NOT NULL DEFAULT 1,
    eliminado BOOLEAN NOT NULL DEFAULT FALSE
);

-- ------------------------------------------------------------------------------
-- 4. TABLA: pagos (Control de Pagos, Membresías y Recaudación)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id VARCHAR(100) NOT NULL DEFAULT '',
    usuario_nombre VARCHAR(150) NOT NULL,
    usuario_cedula VARCHAR(20) NOT NULL,
    fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
    plan VARCHAR(80) NOT NULL DEFAULT 'Mensual',
    servicio VARCHAR(100) NOT NULL DEFAULT 'Gimnasio',
    monto_bs NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    monto_usd NUMERIC(14, 2) DEFAULT 0.00,
    tasa_bcv NUMERIC(10, 4) DEFAULT 0.0000,
    metodo_pago VARCHAR(50) NOT NULL DEFAULT 'Punto de Venta',
    referencia VARCHAR(80) DEFAULT '',
    estado VARCHAR(30) NOT NULL DEFAULT 'Solvente', -- 'Solvente', 'Deuda', 'Suspendido', 'Vencido'
    tipo_membresia VARCHAR(50) DEFAULT 'Mensual',
    fecha_vencimiento DATE,
    observaciones TEXT DEFAULT '',
    ubicacion JSONB NOT NULL DEFAULT '{"estado": "", "municipio": "", "parroquia": ""}'::jsonb,
    registrado_por VARCHAR(50) NOT NULL DEFAULT 'operador',
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. TABLA: asistencias (Control Diario de Entradas, Salidas y Asistencias)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asistencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id VARCHAR(100) NOT NULL DEFAULT '',
    usuario_nombre VARCHAR(150) NOT NULL,
    usuario_cedula VARCHAR(20) NOT NULL,
    disciplina VARCHAR(100) NOT NULL DEFAULT 'General',
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_entrada TIME NOT NULL DEFAULT CURRENT_TIME,
    hora_salida TIME,
    tiempo_horas NUMERIC(5, 2) DEFAULT 0.00,
    estado VARCHAR(30) NOT NULL DEFAULT 'Activo', -- 'Activo', 'Finalizado'
    ubicacion JSONB NOT NULL DEFAULT '{"estado": "", "municipio": "", "parroquia": ""}'::jsonb,
    registrado_por VARCHAR(50) NOT NULL DEFAULT 'operador',
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. TABLA: app_releases (Versión de la Aplicación y Auto-Actualizaciones)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    titulo TEXT NOT NULL,
    notas TEXT DEFAULT '',
    download_url TEXT NOT NULL,
    obligatoria BOOLEAN DEFAULT TRUE,
    publicado_en TIMESTAMPTZ DEFAULT NOW(),
    publicado_por TEXT NOT NULL
);

-- ------------------------------------------------------------------------------
-- 7. TABLA: audit_log (Auditoría y Trazabilidad de Operaciones)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operador_cedula VARCHAR(50) NOT NULL DEFAULT '',
    accion VARCHAR(50) NOT NULL,
    entidad_tipo VARCHAR(30) NOT NULL,
    entidad_id UUID,
    ip_origen VARCHAR(45) DEFAULT '',
    estado_geografico VARCHAR(100) DEFAULT '',
    detalles JSONB DEFAULT '{}'::jsonb,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 8. ÍNDICES DE ALTO RENDIMIENTO (PostgreSQL Best Practices)
-- ==============================================================================

-- A. Búsquedas directas sobre campos JSONB frecuentes (Expression Indexes)
CREATE INDEX IF NOT EXISTS idx_registros_cedula ON public.registros ((datos->>'cedula'));
CREATE INDEX IF NOT EXISTS idx_registros_tipo ON public.registros (tipo);
CREATE INDEX IF NOT EXISTS idx_registros_territorio ON public.registros ((ubicacion->>'estado'), (ubicacion->>'municipio'));

-- B. Índices parciales para consultas selectivas (Partial Indexes)
-- Acelera listados de personas y eventos activos sin escanear registros eliminados
CREATE INDEX IF NOT EXISTS idx_registros_activos ON public.registros (tipo, creado_en DESC) WHERE eliminado = FALSE;

-- Acelera validación de solvencia de gimnasio
CREATE INDEX IF NOT EXISTS idx_pagos_solventes ON public.pagos (usuario_cedula, fecha_pago DESC) WHERE estado = 'Solvente';

-- Acelera consulta de asistencias en curso del día
CREATE INDEX IF NOT EXISTS idx_asistencias_activas ON public.asistencias (fecha, hora_entrada DESC) WHERE estado = 'Activo';

-- C. Índices compuestos para ordenamiento y filtrado de pagos y asistencias
CREATE INDEX IF NOT EXISTS idx_pagos_cedula_fecha ON public.pagos (usuario_cedula, fecha_pago DESC);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha_desc ON public.pagos (fecha_pago DESC);
CREATE INDEX IF NOT EXISTS idx_asistencias_cedula_fecha ON public.asistencias (usuario_cedula, fecha DESC, hora_entrada DESC);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha_desc ON public.asistencias (fecha DESC);

-- D. Índices en perfiles y auditoría
CREATE INDEX IF NOT EXISTS idx_perfiles_cedula ON public.perfiles (cedula);
CREATE INDEX IF NOT EXISTS idx_perfiles_rol ON public.perfiles (rol);
CREATE INDEX IF NOT EXISTS idx_perfiles_estado ON public.perfiles (estado_asignado);
CREATE INDEX IF NOT EXISTS idx_audit_fecha_desc ON public.audit_log (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_app_releases_version ON public.app_releases (version);

-- ==============================================================================
-- 9. VISTAS ANALÍTICAS CON WITH (security_invoker = true)
-- ==============================================================================

CREATE OR REPLACE VIEW public.vista_resumen_totales
WITH (security_invoker = true) AS
SELECT
    (SELECT COUNT(*) FROM public.registros WHERE eliminado = FALSE) AS total_personas,
    (SELECT COALESCE(SUM(monto_bs), 0) FROM public.pagos WHERE estado = 'Solvente') AS total_recaudado_bs,
    (SELECT COUNT(*) FROM public.asistencias) AS total_asistencias;

-- ==============================================================================
-- 10. TRIGGERS Y FUNCIONES AUTOMÁTICAS
-- ==============================================================================

-- A. Función para actualización automática de timestamps
CREATE OR REPLACE FUNCTION public.set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizado_en_perfiles ON public.perfiles;
CREATE TRIGGER trg_actualizado_en_perfiles
    BEFORE UPDATE ON public.perfiles
    FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();

DROP TRIGGER IF EXISTS trg_actualizado_en_registros ON public.registros;
CREATE TRIGGER trg_actualizado_en_registros
    BEFORE UPDATE ON public.registros
    FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();

-- B. Trigger de Auto-Creación de Perfil al Registrarse en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (
    id,
    correo,
    cedula,
    nombres,
    apellidos,
    rol,
    estado_asignado,
    municipio_asignado,
    parroquia_asignada,
    base_misiones_nombre
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'cedula', 'V-' || SUBSTRING(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'nombres', 'Operador'),
    COALESCE(NEW.raw_user_meta_data->>'apellidos', 'Paz y Vida'),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'operador_base'),
    COALESCE(NEW.raw_user_meta_data->>'estado_asignado', 'Distrito Capital'),
    COALESCE(NEW.raw_user_meta_data->>'municipio_asignado', 'Libertador'),
    COALESCE(NEW.raw_user_meta_data->>'parroquia_asignada', 'Sucre'),
    COALESCE(NEW.raw_user_meta_data->>'base_misiones_nombre', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    correo = EXCLUDED.correo,
    actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 11. SEGURIDAD: ROW LEVEL SECURITY (RLS) ESTRICTO
-- ==============================================================================

-- Habilitar RLS en todas las tablas expuestas
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores si existiesen
DROP POLICY IF EXISTS "perfiles_lectura_autenticados" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_modificacion_propia" ON public.perfiles;
DROP POLICY IF EXISTS "registros_select_authenticated" ON public.registros;
DROP POLICY IF EXISTS "registros_insert_authenticated" ON public.registros;
DROP POLICY IF EXISTS "registros_update_authenticated" ON public.registros;
DROP POLICY IF EXISTS "pagos_select_authenticated" ON public.pagos;
DROP POLICY IF EXISTS "pagos_insert_authenticated" ON public.pagos;
DROP POLICY IF EXISTS "pagos_update_authenticated" ON public.pagos;
DROP POLICY IF EXISTS "asistencias_select_authenticated" ON public.asistencias;
DROP POLICY IF EXISTS "asistencias_insert_authenticated" ON public.asistencias;
DROP POLICY IF EXISTS "asistencias_update_authenticated" ON public.asistencias;
DROP POLICY IF EXISTS "releases_select_all" ON public.app_releases;
DROP POLICY IF EXISTS "releases_insert_authenticated" ON public.app_releases;
DROP POLICY IF EXISTS "audit_select_authenticated" ON public.audit_log;
DROP POLICY IF EXISTS "audit_insert_authenticated" ON public.audit_log;

-- Políticas para app_releases (lectura pública para comprobar updates sin requerir login)
CREATE POLICY "releases_select_all"
    ON public.app_releases FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "releases_insert_authenticated"
    ON public.app_releases FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Políticas para perfiles
CREATE POLICY "perfiles_lectura_autenticados"
    ON public.perfiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "perfiles_modificacion_propia"
    ON public.perfiles FOR UPDATE
    TO authenticated
    USING ((select auth.uid()) = id)
    WITH CHECK ((select auth.uid()) = id);

-- Políticas para registros (personas, eventos, documentos, reportes)
CREATE POLICY "registros_select_authenticated"
    ON public.registros FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "registros_insert_authenticated"
    ON public.registros FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "registros_update_authenticated"
    ON public.registros FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Políticas para pagos
CREATE POLICY "pagos_select_authenticated"
    ON public.pagos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "pagos_insert_authenticated"
    ON public.pagos FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "pagos_update_authenticated"
    ON public.pagos FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Políticas para asistencias
CREATE POLICY "asistencias_select_authenticated"
    ON public.asistencias FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "asistencias_insert_authenticated"
    ON public.asistencias FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "asistencias_update_authenticated"
    ON public.asistencias FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Políticas para audit_log (solo INSERT y SELECT, nunca UPDATE o DELETE)
CREATE POLICY "audit_select_authenticated"
    ON public.audit_log FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "audit_insert_authenticated"
    ON public.audit_log FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ==============================================================================
-- 12. CONCESIÓN EXPLÍCITA DE PERMISOS (GRANTS PARA API REST)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Permiso de lectura anónima solo para consultar versiones de la app
GRANT SELECT ON public.app_releases TO anon;

-- ==============================================================================
-- FIN DEL SCRIPT MAESTRO
-- ==============================================================================
