const url = 'https://oxliwrrrmefuisuzdtpr.supabase.co';
const key = 'sb_publishable_XE6powc_BwOMu-vh3CY6tQ_OJq3m4Z5';

async function testAnonCedulaLookup() {
  const cedula = 'V-10200300';
  const res = await fetch(`${url}/rest/v1/perfiles?cedula=eq.${cedula}&select=correo`, {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  console.log('Status anon lookup:', res.status);
  const data = await res.json();
  console.log('Data anon lookup:', data);
}

testAnonCedulaLookup();
