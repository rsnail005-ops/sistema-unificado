-- ==============================================================================
-- LIMPIEZA DE USUARIOS Y POLÍTICA DE CONSULTA DE CÉDULA
-- Ejecuta este script en Supabase Dashboard > SQL Editor > New Query > Run
-- ==============================================================================

-- 1. Eliminar cuentas de prueba o administradores viejos no deseados de Auth
-- (Al eliminar de auth.users se eliminan automáticamente de perfiles por ON DELETE CASCADE)
DELETE FROM auth.users WHERE email IN (
  'admin_test_001@gmail.com',
  'test_check_1790995023071@pazyvida.com'
  -- Si deseas borrar también admin_pazyvida@gmail.com y dejar únicamente admin@pazyvida.gob.ve,
  -- descomenta la siguiente línea:
  -- ,'admin_pazyvida@gmail.com'
);

-- 2. Permitir que la aplicación pueda consultar el correo asociado a una cédula
-- antes de que el usuario inicie sesión (para que el login con Cédula funcione siempre)
DROP POLICY IF EXISTS perfiles_anon_read ON public.perfiles;
CREATE POLICY "perfiles_anon_read" ON public.perfiles FOR SELECT TO anon USING (true);
