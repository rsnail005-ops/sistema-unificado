-- ==============================================================================
-- Migración: Tabla de Releases para Sistema de Actualizaciones Automáticas
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.app_releases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version       text NOT NULL,
  titulo        text NOT NULL,
  notas         text DEFAULT '',
  download_url  text NOT NULL,
  obligatoria   boolean DEFAULT true,
  publicado_en  timestamptz DEFAULT now(),
  publicado_por text NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas restrictivas previas si existen
DROP POLICY IF EXISTS "releases_select_authenticated" ON public.app_releases;
DROP POLICY IF EXISTS "releases_insert_authenticated" ON public.app_releases;
DROP POLICY IF EXISTS "releases_select_all" ON public.app_releases;
DROP POLICY IF EXISTS "releases_insert_all" ON public.app_releases;

-- Permitir lectura a todos (para que la app detecte actualizaciones antes o después de login)
CREATE POLICY "releases_select_all"
  ON public.app_releases FOR SELECT
  USING (true);

-- Permitir inserción de releases
CREATE POLICY "releases_insert_all"
  ON public.app_releases FOR INSERT
  WITH CHECK (true);
