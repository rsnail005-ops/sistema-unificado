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

-- Cualquier usuario autenticado puede leer las versiones disponibles
CREATE POLICY "releases_select_authenticated"
  ON public.app_releases FOR SELECT
  USING (auth.role() = 'authenticated');

-- Cualquier usuario autenticado (desarrollador) puede insertar un release
CREATE POLICY "releases_insert_authenticated"
  ON public.app_releases FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
