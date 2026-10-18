const url = 'https://oxliwrrrmefuisuzdtpr.supabase.co';
const key = 'sb_publishable_XE6powc_BwOMu-vh3CY6tQ_OJq3m4Z5';

async function testProfiles() {
  const res = await fetch(`${url}/rest/v1/perfiles?select=*`, {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  console.log('PERFILES status:', res.status);
  const data = await res.json();
  console.log('PERFILES data:', JSON.stringify(data, null, 2));
}

testProfiles();
