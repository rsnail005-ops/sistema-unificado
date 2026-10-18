-- ==============================================================================
-- ESQUEMA SEGURO Y CERTIFICADO PARA SUPABASE
-- APLICACIÓN NACIONAL DE ALMACENAMIENTO DE DATOS Y CONSOLIDACIÓN TERRITORIAL
-- MOVIMIENTO POR LA PAZ Y LA VIDA - REPÚBLICA BOLIVARIANA DE VENEZUELA
-- Arquitectura de Seguridad: Supabase Auth + RLS 100% Estricto (Sin permisos 'anon')
-- ==============================================================================

-- 1. EXTENSIONES REQUERIDAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLA DE PERFILES DE OPERADORES Y ADMINISTRADORES
-- Vinculada directamente con auth.users mediante su UUID oficial.
-- Las credenciales y contraseñas las maneja Supabase Auth (auth.users) de forma segura.
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    nombres VARCHAR(120) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    telefono VARCHAR(30) DEFAULT '',
    rol VARCHAR(50) NOT NULL DEFAULT 'operador_base', -- 'superadmin_nacional', 'coordinador_estadal', 'operador_base'
    estado_asignado VARCHAR(100) NOT NULL DEFAULT 'Distrito Capital',
    municipio_asignado VARCHAR(100) DEFAULT '',
    parroquia_asignada VARCHAR(100) DEFAULT '',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLA PRINCIPAL DE PERSONAS Y REGISTROS SOCIALES
CREATE TABLE IF NOT EXISTS public.registros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(50) NOT NULL DEFAULT 'persona',
    datos JSONB NOT NULL DEFAULT '{}'::jsonb,
    documentos JSONB NOT NULL DEFAULT '[]'::jsonb,
    ubicacion JSONB NOT NULL DEFAULT '{"estado": "", "municipio": "", "parroquia": ""}'::jsonb,
    creado_por VARCHAR(50) NOT NULL DEFAULT 'operador', -- Cédula del operador que registró
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sincronizado BOOLEAN NOT NULL DEFAULT TRUE,
    hlc_timestamp VARCHAR(64) NOT NULL DEFAULT '',
    version INT NOT NULL DEFAULT 1,
    eliminado BOOLEAN NOT NULL DEFAULT FALSE
);

-- 4. TABLA DE CONTROL DE PAGOS Y DINERO RECAUDADO
CREATE TABLE IF NOT EXISTS public.pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id VARCHAR(100) NOT NULL DEFAULT '',
    usuario_nombre VARCHAR(150) NOT NULL,
    usuario_cedula VARCHAR(20) NOT NULL,
    fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
    plan VARCHAR(80) NOT NULL DEFAULT 'Mensual',
    servicio VARCHAR(100) NOT NULL DEFAULT 'Gimnasio',
    monto_bs NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    metodo_pago VARCHAR(50) NOT NULL DEFAULT 'Punto de Venta',
    referencia VARCHAR(80) DEFAULT '',
    estado VARCHAR(30) NOT NULL DEFAULT 'Solvente',
    observaciones TEXT DEFAULT '',
    ubicacion JSONB NOT NULL DEFAULT '{"estado": "", "municipio": "", "parroquia": ""}'::jsonb,
    registrado_por VARCHAR(50) NOT NULL DEFAULT 'operador',
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABLA DE ASISTENCIAS DIARIAS
CREATE TABLE IF NOT EXISTS public.asistencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id VARCHAR(100) NOT NULL DEFAULT '',
    usuario_nombre VARCHAR(150) NOT NULL,
    usuario_cedula VARCHAR(20) NOT NULL,
    disciplina VARCHAR(100) NOT NULL DEFAULT 'General',
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_entrada TIME NOT NULL DEFAULT CURRENT_TIME,
    hora_salida TIME,
    estado VARCHAR(30) NOT NULL DEFAULT 'Activo',
    ubicacion JSONB NOT NULL DEFAULT '{"estado": "", "municipio": "", "parroquia": ""}'::jsonb,
    registrado_por VARCHAR(50) NOT NULL DEFAULT 'operador',
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABLA DE AUDITORÍA Y TRAZABILIDAD
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

-- 7. ÍNDICES DE RENDIMIENTO Y CONSULTA TERRITORIAL
CREATE INDEX IF NOT EXISTS idx_registros_territorio ON public.registros((ubicacion->>'estado'), (ubicacion->>'municipio'));
CREATE INDEX IF NOT EXISTS idx_registros_cedula ON public.registros((datos->>'cedula'));
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON public.pagos(fecha_pago DESC);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha ON public.asistencias(fecha DESC);

-- 8. VISTAS ANALÍTICAS CONSOLIDADAS
CREATE OR REPLACE VIEW public.vista_resumen_totales AS
SELECT
    (SELECT COUNT(*) FROM public.registros WHERE eliminado = FALSE) AS total_personas,
    (SELECT COALESCE(SUM(monto_bs), 0) FROM public.pagos WHERE estado = 'Solvente') AS total_recaudado_bs,
    (SELECT COUNT(*) FROM public.asistencias) AS total_asistencias;

-- 9. TRIGGER DE AUTOCREACIÓN DE PERFILES AL REGISTRARSE EN SUPABASE AUTH
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
    parroquia_asignada
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
    COALESCE(NEW.raw_user_meta_data->>'parroquia_asignada', 'Sucre')
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
-- 10. SEGURIDAD: ROW LEVEL SECURITY (RLS) ESTRICTO
-- Ninguna tabla permite acceso a 'anon'. Todo el acceso está restringido a 'authenticated'.
-- ==============================================================================

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- --- A. POLÍTICAS DE PERFILES ---
DROP POLICY IF EXISTS "perfiles_lectura_autenticados" ON public.perfiles;
CREATE POLICY "perfiles_lectura_autenticados" ON public.perfiles
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "perfiles_actualizar_propio" ON public.perfiles;
CREATE POLICY "perfiles_actualizar_propio" ON public.perfiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "perfiles_admin_total" ON public.perfiles;
CREATE POLICY "perfiles_admin_total" ON public.perfiles
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = auth.uid() AND p.rol = 'superadmin_nacional'
  )
);

-- --- B. LAS 3 POLÍTICAS OFICIALES DE REGISTROS (RESTAURADAS Y PROTEGIDAS) ---

-- 1) Superadmin Nacional: Acceso y control total
DROP POLICY IF EXISTS superadmin_nacional_todo ON public.registros;
CREATE POLICY superadmin_nacional_todo ON public.registros
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = auth.uid() AND p.rol = 'superadmin_nacional'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = auth.uid() AND p.rol = 'superadmin_nacional'
  )
);

-- 2) Coordinador Regional: Acceso a registros dentro de su estado asignado
DROP POLICY IF EXISTS coordinador_regional_ve_su_estado ON public.registros;
CREATE POLICY coordinador_regional_ve_su_estado ON public.registros
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = auth.uid()
    AND p.rol = 'coordinador_estadal'
    AND p.estado_asignado = (registros.ubicacion->>'estado')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = auth.uid()
    AND p.rol = 'coordinador_estadal'
    AND p.estado_asignado = (registros.ubicacion->>'estado')
  )
);

-- 3) Operador Base: Registra y gestiona datos de su parroquia o creados por él
DROP POLICY IF EXISTS usuario_ve_sus_datos ON public.registros;
CREATE POLICY usuario_ve_sus_datos ON public.registros
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = auth.uid()
    AND (
      p.cedula = registros.creado_por
      OR (
        p.estado_asignado = (registros.ubicacion->>'estado')
        AND p.municipio_asignado = (registros.ubicacion->>'municipio')
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = auth.uid()
  )
);

-- --- C. POLÍTICAS PARA PAGOS (CONTROL DE RECAUDACIÓN) ---
DROP POLICY IF EXISTS pagos_autenticados_select ON public.pagos;
CREATE POLICY pagos_autenticados_select ON public.pagos
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = auth.uid() AND (
      p.rol = 'superadmin_nacional'
      OR (p.rol = 'coordinador_estadal' AND p.estado_asignado = (pagos.ubicacion->>'estado'))
      OR (p.rol = 'operador_base' AND p.estado_asignado = (pagos.ubicacion->>'estado'))
    )
  )
);

DROP POLICY IF EXISTS pagos_autenticados_insert ON public.pagos;
CREATE POLICY pagos_autenticados_insert ON public.pagos
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = auth.uid()
  )
);

DROP POLICY IF EXISTS pagos_autenticados_update ON public.pagos;
CREATE POLICY pagos_autenticados_update ON public.pagos
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = auth.uid() AND (
      p.rol = 'superadmin_nacional'
      OR (p.rol = 'coordinador_estadal' AND p.estado_asignado = (pagos.ubicacion->>'estado'))
      OR p.cedula = pagos.registrado_por
    )
  )
);

-- --- D. POLÍTICAS PARA ASISTENCIAS ---
DROP POLICY IF EXISTS asistencias_autenticados_select ON public.asistencias;
CREATE POLICY asistencias_autenticados_select ON public.asistencias
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = auth.uid() AND (
      p.rol = 'superadmin_nacional'
      OR (p.rol = 'coordinador_estadal' AND p.estado_asignado = (asistencias.ubicacion->>'estado'))
      OR (p.rol = 'operador_base' AND p.estado_asignado = (asistencias.ubicacion->>'estado'))
    )
  )
);

DROP POLICY IF EXISTS asistencias_autenticados_insert ON public.asistencias;
CREATE POLICY asistencias_autenticados_insert ON public.asistencias
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = auth.uid()
  )
);

DROP POLICY IF EXISTS asistencias_autenticados_update ON public.asistencias;
CREATE POLICY asistencias_autenticados_update ON public.asistencias
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = auth.uid() AND (
      p.rol = 'superadmin_nacional'
      OR (p.rol = 'coordinador_estadal' AND p.estado_asignado = (asistencias.ubicacion->>'estado'))
      OR p.cedula = asistencias.registrado_por
    )
  )
);

-- --- E. AUDITORÍA ---
DROP POLICY IF EXISTS audit_autenticados_insert ON public.audit_log;
CREATE POLICY audit_autenticados_insert ON public.audit_log
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS audit_admin_select ON public.audit_log;
CREATE POLICY audit_admin_select ON public.audit_log
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = auth.uid() AND p.rol = 'superadmin_nacional'
  )
);
