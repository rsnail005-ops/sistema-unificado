-- ============================================================================
-- MIGRACIÓN: BIBLIOTECA DE BASES DE MISIONES
-- Sistema Nacional Movimiento Paz y Vida
-- Tablas: bases_misiones, base_disciplinas, base_reportes
-- ============================================================================

-- 1. Tabla de Bases de Misiones
CREATE TABLE IF NOT EXISTS public.bases_misiones (
  id             TEXT PRIMARY KEY,              -- 'base-001' ... 'base-035'
  nombre         TEXT NOT NULL,
  estado         TEXT NOT NULL,
  municipio      TEXT,
  direccion      TEXT,
  administrador  TEXT,
  pisos_config   JSONB DEFAULT '{}'::jsonb,
  activa         BOOLEAN DEFAULT true,
  creado_en      TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bases_misiones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bases_misiones_select" ON public.bases_misiones;
CREATE POLICY "bases_misiones_select" ON public.bases_misiones
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "bases_misiones_write" ON public.bases_misiones;
CREATE POLICY "bases_misiones_write" ON public.bases_misiones
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 2. Tabla de Disciplinas por Base
CREATE TABLE IF NOT EXISTS public.base_disciplinas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id     TEXT NOT NULL REFERENCES public.bases_misiones(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  piso        TEXT NOT NULL,                  -- 'Recepción', 'Piso 1' ... 'Piso 5'
  tutor       TEXT,
  horarios    JSONB DEFAULT '[]'::jsonb,      -- [{dia, hora_inicio, hora_fin}]
  precio_bs   NUMERIC(12,2),
  precio_usd  NUMERIC(8,2),
  activa      BOOLEAN DEFAULT true,
  creado_en   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_base_disciplinas_base ON public.base_disciplinas(base_id);

ALTER TABLE public.base_disciplinas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "base_disciplinas_select" ON public.base_disciplinas;
CREATE POLICY "base_disciplinas_select" ON public.base_disciplinas
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "base_disciplinas_write" ON public.base_disciplinas;
CREATE POLICY "base_disciplinas_write" ON public.base_disciplinas
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 3. Tabla de Reportes Históricos (Semanales y Mensuales)
CREATE TABLE IF NOT EXISTS public.base_reportes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id      TEXT NOT NULL REFERENCES public.bases_misiones(id) ON DELETE CASCADE,
  tipo         TEXT NOT NULL CHECK (tipo IN ('semanal', 'mensual')),
  periodo      TEXT NOT NULL,                 -- '2025-W42' o '2025-10'
  datos_json   JSONB NOT NULL,                -- snapshot KPIs + disciplinas
  generado_en  TIMESTAMPTZ DEFAULT now(),
  generado_por TEXT DEFAULT 'sistema'
);

CREATE INDEX IF NOT EXISTS idx_base_reportes_base_periodo ON public.base_reportes(base_id, tipo, periodo);

ALTER TABLE public.base_reportes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "base_reportes_select" ON public.base_reportes;
CREATE POLICY "base_reportes_select" ON public.base_reportes
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "base_reportes_write" ON public.base_reportes;
CREATE POLICY "base_reportes_write" ON public.base_reportes
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
