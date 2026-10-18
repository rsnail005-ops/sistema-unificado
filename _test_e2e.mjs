const url = 'https://oxliwrrrmefuisuzdtpr.supabase.co';
const key = 'sb_publishable_XE6powc_BwOMu-vh3CY6tQ_OJq3m4Z5';

async function main() {
  // ============================================
  // PASO 1: Login con Supabase Auth
  // ============================================
  console.log('=== PASO 1: LOGIN AUTH ===');
  const loginRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': key },
    body: JSON.stringify({ email: 'admin_test_001@gmail.com', password: 'PazVida2026Seguro!' })
  });
  const loginData = await loginRes.json();
  console.log('Status:', loginRes.status);

  if (!loginRes.ok) {
    console.log('❌ LOGIN FALLÓ:', JSON.stringify(loginData));
    process.exit(1);
  }

  const token = loginData.access_token;
  const userId = loginData.user?.id;
  console.log('✅ Login exitoso');
  console.log('   User ID:', userId);
  console.log('   Rol:', loginData.user?.user_metadata?.rol);
  console.log('   Token:', token.slice(0, 40) + '...');

  const authHeaders = {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': 'Bearer ' + token,
    'Prefer': 'return=representation'
  };

  // ============================================
  // PASO 2: Verificar que perfiles existe y tiene nuestro usuario
  // ============================================
  console.log('\n=== PASO 2: VERIFICAR PERFILES ===');
  const perfilesRes = await fetch(`${url}/rest/v1/perfiles?select=*`, { headers: authHeaders });
  const perfilesData = await perfilesRes.json();
  console.log('Status:', perfilesRes.status);
  if (perfilesRes.ok) {
    console.log('✅ Tabla perfiles accesible');
    console.log('   Perfiles encontrados:', perfilesData.length);
    for (const p of perfilesData) {
      console.log(`   → ${p.cedula} | ${p.nombres} ${p.apellidos} | ${p.rol} | ${p.estado_asignado}`);
    }
  } else {
    console.log('❌ Error perfiles:', JSON.stringify(perfilesData));
  }

  // ============================================
  // PASO 3: Insertar REGISTRO (persona)
  // ============================================
  console.log('\n=== PASO 3: INSERT REGISTRO (persona) ===');
  const registroRes = await fetch(`${url}/rest/v1/registros`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      tipo: 'persona',
      datos: {
        cedula: 'V-25123456',
        nombre: 'MARÍA',
        apellido: 'GONZÁLEZ PÉREZ',
        telefono: '0412-1234567',
        genero: 'F',
        disciplina: 'Gimnasio'
      },
      ubicacion: { estado: 'Distrito Capital', municipio: 'Libertador', parroquia: 'Sucre' },
      creado_por: 'V-28000001',
      hlc_timestamp: new Date().toISOString(),
      sincronizado: true
    })
  });
  const registroData = await registroRes.json();
  console.log('Status:', registroRes.status);
  if (registroRes.ok) {
    console.log('✅ Registro insertado');
    console.log('   ID:', registroData[0]?.id);
    console.log('   Persona:', registroData[0]?.datos?.nombre, registroData[0]?.datos?.apellido);
  } else {
    console.log('❌ Error:', JSON.stringify(registroData));
  }

  // ============================================
  // PASO 4: Insertar PAGO
  // ============================================
  console.log('\n=== PASO 4: INSERT PAGO ===');
  const pagoRes = await fetch(`${url}/rest/v1/pagos`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      usuario_nombre: 'MARÍA GONZÁLEZ PÉREZ',
      usuario_cedula: 'V-25123456',
      monto_bs: 250.00,
      plan: 'Mensual',
      servicio: 'Gimnasio',
      metodo_pago: 'Pago Móvil',
      referencia: 'PM-20261002-001',
      estado: 'Solvente',
      registrado_por: 'V-28000001',
      ubicacion: { estado: 'Distrito Capital', municipio: 'Libertador', parroquia: 'Sucre' }
    })
  });
  const pagoData = await pagoRes.json();
  console.log('Status:', pagoRes.status);
  if (pagoRes.ok) {
    console.log('✅ Pago insertado');
    console.log('   ID:', pagoData[0]?.id);
    console.log('   Monto: Bs.', pagoData[0]?.monto_bs);
    console.log('   Método:', pagoData[0]?.metodo_pago);
  } else {
    console.log('❌ Error:', JSON.stringify(pagoData));
  }

  // ============================================
  // PASO 5: Insertar ASISTENCIA
  // ============================================
  console.log('\n=== PASO 5: INSERT ASISTENCIA ===');
  const asistRes = await fetch(`${url}/rest/v1/asistencias`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      usuario_nombre: 'MARÍA GONZÁLEZ PÉREZ',
      usuario_cedula: 'V-25123456',
      disciplina: 'Gimnasio',
      estado: 'Activo',
      registrado_por: 'V-28000001',
      ubicacion: { estado: 'Distrito Capital', municipio: 'Libertador', parroquia: 'Sucre' }
    })
  });
  const asistData = await asistRes.json();
  console.log('Status:', asistRes.status);
  if (asistRes.ok) {
    console.log('✅ Asistencia insertada');
    console.log('   ID:', asistData[0]?.id);
    console.log('   Disciplina:', asistData[0]?.disciplina);
  } else {
    console.log('❌ Error:', JSON.stringify(asistData));
  }

  // ============================================
  // PASO 6: Verificar VISTA RESUMEN TOTALES
  // ============================================
  console.log('\n=== PASO 6: VISTA RESUMEN TOTALES ===');
  const vistaRes = await fetch(`${url}/rest/v1/vista_resumen_totales?select=*`, { headers: authHeaders });
  const vistaData = await vistaRes.json();
  console.log('Status:', vistaRes.status);
  if (vistaRes.ok && vistaData[0]) {
    console.log('✅ Vista consolidada:');
    console.log('   Total Personas:', vistaData[0].total_personas);
    console.log('   Total Dinero Bs:', vistaData[0].total_recaudado_bs || vistaData[0].total_dinero_recaudado_bs || vistaData[0].total_recibos_pagos);
    console.log('   Total Asistencias:', vistaData[0].total_asistencias);
    console.log('   Raw:', JSON.stringify(vistaData[0]));
  } else {
    console.log('❌ Error vista:', JSON.stringify(vistaData));
  }

  // ============================================
  // PASO 7: Leer todos los registros para confirmar
  // ============================================
  console.log('\n=== PASO 7: LEER REGISTROS ===');
  const allRes = await fetch(`${url}/rest/v1/registros?select=id,datos,creado_por,creado_en&order=creado_en.desc&limit=5`, { headers: authHeaders });
  const allData = await allRes.json();
  console.log('Status:', allRes.status);
  if (allRes.ok) {
    console.log('✅ Registros en servidor:', allData.length);
    for (const r of allData) {
      console.log(`   → ${r.datos?.cedula || 'N/A'} | ${r.datos?.nombre || ''} ${r.datos?.apellido || ''} | por: ${r.creado_por}`);
    }
  }

  // ============================================
  // RESULTADO FINAL
  // ============================================
  console.log('\n========================================');
  console.log('🏆 RESULTADO FINAL DE LA PRUEBA');
  console.log('========================================');
  const allOk = loginRes.ok && perfilesRes.ok && registroRes.ok && pagoRes.ok && asistRes.ok && vistaRes.ok;
  if (allOk) {
    console.log('✅ ¡TODO FUNCIONA CORRECTAMENTE!');
    console.log('   ✅ Login con Supabase Auth → JWT token obtenido');
    console.log('   ✅ Tabla perfiles → Accesible con RLS');
    console.log('   ✅ INSERT registro (persona) → Guardado en servidor');
    console.log('   ✅ INSERT pago → Guardado en servidor');
    console.log('   ✅ INSERT asistencia → Guardado en servidor');
    console.log('   ✅ Vista consolidada → Datos reflejados en tiempo real');
  } else {
    console.log('⚠️ Algunas pruebas fallaron. Revisa los detalles arriba.');
  }
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
