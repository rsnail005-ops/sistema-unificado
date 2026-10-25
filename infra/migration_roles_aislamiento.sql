-- ==============================================================================
-- MIGRACIÓN DE ROLES OFICIALES Y AISLAMIENTO DE DATOS
-- PROYECTO SUPABASE: jrjkuzjpabfaburppgtb
-- 
-- ROLES OFICIALES:
-- 1. 'desarrollador': Privilegios totales sin límite (datos nacionales, consola dev, publicación de versiones)
-- 2. 'administrador_nacional': Visualización de todos los datos del país. No modifica el programa.
-- 3. 'administrador_base': Visualización y registro exclusivo de su base asignada. No ve otras bases ni modifica el programa.
-- ==============================================================================

-- 1. Actualizar roles existentes para converger a los 3 roles oficiales
UPDATE public.perfiles
SET rol = 'desarrollador'
WHERE rol IN ('developer', 'desarrollador', 'superadmin', 'admin');

UPDATE public.perfiles
SET rol = 'administrador_nacional'
WHERE rol IN ('superadmin_nacional', 'administrador_nacional', 'coordinador_estadal');

UPDATE public.perfiles
SET rol = 'administrador_base'
WHERE rol NOT IN ('desarrollador', 'administrador_nacional');

-- 2. Modificar el valor por defecto de la columna rol
ALTER TABLE public.perfiles 
    ALTER COLUMN rol SET DEFAULT 'administrador_base';

-- 3. Función y Trigger para auto-normalizar roles en public.perfiles
CREATE OR REPLACE FUNCTION public.fn_normalizar_rol_perfil()
RETURNS TRIGGER AS $$
BEGIN
    -- Normalizar a minúsculas y sin espacios
    NEW.rol := LOWER(TRIM(COALESCE(NEW.rol, 'administrador_base')));

    -- Mapeo de sinónimos al rol canónico oficial
    IF NEW.rol IN ('developer', 'desarrollador', 'superadmin', 'admin') THEN
        NEW.rol := 'desarrollador';
    ELSIF NEW.rol IN ('superadmin_nacional', 'administrador_nacional', 'admin_nacional', 'coordinador_estadal', 'nacional') THEN
        NEW.rol := 'administrador_nacional';
    ELSE
        NEW.rol := 'administrador_base';
    END IF;

    -- Si es administrador de base y no tiene base asignada, asignar por defecto
    IF NEW.rol = 'administrador_base' AND (NEW.base_misiones_nombre IS NULL OR TRIM(NEW.base_misiones_nombre) = '') THEN
        NEW.base_misiones_nombre := 'Gran Base de Paz Principal';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalizar_rol_perfil ON public.perfiles;
CREATE TRIGGER trg_normalizar_rol_perfil
    BEFORE INSERT OR UPDATE ON public.perfiles
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_normalizar_rol_perfil();

-- 4. Constraint CHECK estricto para los 3 roles
ALTER TABLE public.perfiles
    DROP CONSTRAINT IF EXISTS chk_perfiles_roles_oficiales;

ALTER TABLE public.perfiles
    ADD CONSTRAINT chk_perfiles_roles_oficiales
    CHECK (rol IN ('desarrollador', 'administrador_nacional', 'administrador_base'));

-- 5. Restricción en app_releases: sólo un usuario con rol 'desarrollador' puede insertar/publicar releases
DROP POLICY IF EXISTS "releases_insert_authenticated" ON public.app_releases;
DROP POLICY IF EXISTS "releases_insert_desarrollador" ON public.app_releases;

CREATE POLICY "releases_insert_desarrollador"
    ON public.app_releases FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.perfiles p
            WHERE p.id = (select auth.uid())
              AND p.rol = 'desarrollador'
        )
    );

-- 6. Índices para optimizar consultas filtradas por base de misiones y rol
CREATE INDEX IF NOT EXISTS idx_perfiles_rol_base 
    ON public.perfiles (rol, base_misiones_nombre);

CREATE INDEX IF NOT EXISTS idx_registros_datos_base 
    ON public.registros USING gin ((datos -> 'base_misiones'));

CREATE INDEX IF NOT EXISTS idx_pagos_comunidad 
    ON public.pagos (((ubicacion ->> 'comunidad')));

CREATE INDEX IF NOT EXISTS idx_asistencias_comunidad 
    ON public.asistencias (((ubicacion ->> 'comunidad')));
