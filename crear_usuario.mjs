/**
 * Herramienta para Crear Usuarios en el Servidor Supabase
 * 
 * Uso desde PowerShell:
 *   $env:PATH = "C:\Program Files\nodejs;" + $env:PATH
 *   node crear_usuario.mjs <correo> <contraseña> <rol> <cedula> <nombres> <apellidos>
 * 
 * Ejemplo:
 *   node crear_usuario.mjs operador_caracas@gmail.com paz1234 operador_base V-24111222 "Pedro" "Perez"
 */

const url = 'https://oxliwrrrmefuisuzdtpr.supabase.co';
const key = 'sb_publishable_XE6powc_BwOMu-vh3CY6tQ_OJq3m4Z5';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('\n❌ Uso incorrecto. Debe ingresar al menos correo y contraseña.');
    console.log('📌 Formato: node crear_usuario.mjs <correo> <contraseña> [rol] [cedula] [nombres] [apellidos]');
    console.log('💡 Ejemplo: node crear_usuario.mjs nuevo@gmail.com miClave123 superadmin_nacional V-25000000 "Ana" "Gomez"\n');
    process.exit(1);
  }

  const email = args[0].trim();
  const password = args[1].trim();
  const rol = args[2] ? args[2].trim() : 'operador_base';
  const cedula = args[3] ? args[3].trim().toUpperCase() : 'V-' + Math.floor(10000000 + Math.random() * 90000000);
  const nombres = args[4] ? args[4].trim() : 'Operador';
  const apellidos = args[5] ? args[5].trim() : 'Paz y Vida';

  if (password.length < 6) {
    console.log('\n❌ Error: La contraseña debe tener al menos 6 caracteres.\n');
    process.exit(1);
  }

  console.log(`\n⏳ Creando usuario en Supabase...`);
  console.log(`   📧 Correo: ${email}`);
  console.log(`   🔑 Clave:  ${password}`);
  console.log(`   🏷️  Rol:    ${rol}`);
  console.log(`   🪪  Cédula: ${cedula}`);

  // 1. Crear en Auth
  const signupRes = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': key },
    body: JSON.stringify({ email, password })
  });

  const signupData = await signupRes.json();
  if (!signupRes.ok) {
    console.log(`\n❌ Error al crear usuario:`, signupData.msg || signupData.error_description || signupData);
    process.exit(1);
  }

  const userId = signupData.user?.id;
  const token = signupData.access_token;
  console.log(`✅ Usuario creado en Auth (UUID: ${userId})`);

  // 2. Si no devolvió token inmediato (por ejemplo si requiriera login), hacer login para actualizar perfil
  let authToken = token;
  if (!authToken) {
    const loginRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': key },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    if (loginRes.ok) {
      authToken = loginData.access_token;
    }
  }

  // 3. Actualizar datos oficiales en public.perfiles
  if (authToken) {
    const patchRes = await fetch(`${url}/rest/v1/perfiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${authToken}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        cedula,
        nombres,
        apellidos,
        rol,
        activo: true
      })
    });

    if (patchRes.ok) {
      console.log(`✅ Perfil oficial actualizado con rol [${rol}] y cédula [${cedula}]`);
    }
  }

  console.log(`\n🎉 ¡LISTO! El usuario ya puede iniciar sesión en la aplicación.`);
  console.log(`====================================================\n`);
}

main().catch(err => {
  console.error('\n❌ Error inesperado:', err.message);
});
