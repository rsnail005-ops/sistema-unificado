-- ==============================================================================
-- SQL PARA EJECUTAR EN SUPABASE SQL EDITOR
-- Copia TODO este contenido y pégalo en:
-- https://supabase.com/dashboard > Tu proyecto > SQL Editor > New Query
-- Luego presiona "Run" (elige "Run and enable RLS" si pregunta)
-- ==============================================================================

-- 1. Crear tabla perfiles (la única que falta)
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    nombres VARCHAR(120) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    telefono VARCHAR(30) DEFAULT '',
    rol VARCHAR(50) NOT NULL DEFAULT 'operador_base',
    estado_asignado VARCHAR(100) NOT NULL DEFAULT 'Distrito Capital',
    municipio_asignado VARCHAR(100) DEFAULT '',
    parroquia_asignada VARCHAR(100) DEFAULT '',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Habilitar RLS en perfiles
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de perfiles
CREATE POLICY "perfiles_lectura_auth" ON public.perfiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfiles_update_propio" ON public.perfiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "perfiles_insert_auth" ON public.perfiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 4. Trigger que crea perfil automáticamente al registrar usuario en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, correo, cedula, nombres, apellidos, rol, estado_asignado, municipio_asignado, parroquia_asignada)
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
  ON CONFLICT (id) DO UPDATE SET correo = EXCLUDED.correo, actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Crear perfil admin para el usuario ya registrado
INSERT INTO public.perfiles (id, cedula, nombres, apellidos, correo, rol, estado_asignado, municipio_asignado, parroquia_asignada)
VALUES (
  'f0dc7762-2443-42d5-97f9-a85085c38761',
  'V-28000001',
  'Admin',
  'Test Nacional',
  'admin_test_001@gmail.com',
  'superadmin_nacional',
  'Distrito Capital',
  'Libertador',
  'Sucre'
)
ON CONFLICT (id) DO UPDATE SET rol = 'superadmin_nacional', actualizado_en = NOW();

-- 6. Limpiar políticas viejas/rotas de las tablas existentes
DROP POLICY IF EXISTS coordinador_regional_ve_su_estado ON public.registros;
DROP POLICY IF EXISTS superadmin_nacional_todo ON public.registros;
DROP POLICY IF EXISTS usuario_ve_sus_datos ON public.registros;
DROP POLICY IF EXISTS app_desktop_anon_insert ON public.registros;
DROP POLICY IF EXISTS app_desktop_anon_select ON public.registros;
DROP POLICY IF EXISTS app_desktop_anon_update ON public.registros;
DROP POLICY IF EXISTS rls_registros_territorial ON public.registros;
DROP POLICY IF EXISTS app_desktop_anon_pagos ON public.pagos;
DROP POLICY IF EXISTS rls_pagos_territorial ON public.pagos;
DROP POLICY IF EXISTS app_desktop_anon_asistencias ON public.asistencias;
DROP POLICY IF EXISTS rls_asistencias_territorial ON public.asistencias;
DROP POLICY IF EXISTS app_desktop_anon_audit ON public.audit_log;

-- 7. Políticas limpias para registros (authenticated puede todo)
CREATE POLICY "registros_auth_select" ON public.registros FOR SELECT TO authenticated USING (true);
CREATE POLICY "registros_auth_insert" ON public.registros FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "registros_auth_update" ON public.registros FOR UPDATE TO authenticated USING (true);
CREATE POLICY "registros_auth_delete" ON public.registros FOR DELETE TO authenticated USING (true);

-- 8. Políticas limpias para pagos
DROP POLICY IF EXISTS pagos_autenticados_select ON public.pagos;
DROP POLICY IF EXISTS pagos_autenticados_insert ON public.pagos;
DROP POLICY IF EXISTS pagos_autenticados_update ON public.pagos;
CREATE POLICY "pagos_auth_select" ON public.pagos FOR SELECT TO authenticated USING (true);
CREATE POLICY "pagos_auth_insert" ON public.pagos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pagos_auth_update" ON public.pagos FOR UPDATE TO authenticated USING (true);

-- 9. Políticas limpias para asistencias
DROP POLICY IF EXISTS asistencias_autenticados_select ON public.asistencias;
DROP POLICY IF EXISTS asistencias_autenticados_insert ON public.asistencias;
DROP POLICY IF EXISTS asistencias_autenticados_update ON public.asistencias;
CREATE POLICY "asistencias_auth_select" ON public.asistencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "asistencias_auth_insert" ON public.asistencias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "asistencias_auth_update" ON public.asistencias FOR UPDATE TO authenticated USING (true);

-- 10. Políticas anon de solo lectura (necesarias para health check y modo desconectado)
DROP POLICY IF EXISTS registros_anon_read ON public.registros;
CREATE POLICY "registros_anon_read" ON public.registros FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS pagos_anon_read ON public.pagos;
CREATE POLICY "pagos_anon_read" ON public.pagos FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS asistencias_anon_read ON public.asistencias;
CREATE POLICY "asistencias_anon_read" ON public.asistencias FOR SELECT TO anon USING (true);
