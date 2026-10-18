// Prueba en vivo de todas las fuentes disponibles para cédulas venezolanas
const https = require('https');
const http = require('http');

function httpGet(url, options) {
  options = options || {};
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-VE,es;q=0.9'
      },
      timeout: options.timeout || 10000,
      rejectUnauthorized: false
    }, (res) => {
      let data = '';
      if (options.encoding) res.setEncoding(options.encoding);
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'TIMEOUT' }); });
  });
}

async function testAll(cedula) {
  const numOnly = cedula.replace(/[^0-9]/g, '');
  const prefix = 'V';
  const cedulaFormato = `V${numOnly}`;

  console.log('\n========================================');
  console.log(`Probando cédula: V-${numOnly}`);
  console.log('========================================');

  // 1. ArmandoData
  console.log('\n[1] ArmandoData...');
  try {
    const res = await httpGet(`https://armandodata.com/Personas/Detalles?cedula=${cedulaFormato}`);
    if (res.error) { console.log('  ERROR:', res.error); }
    else {
      const m1 = res.data.match(/Nombre Completo[\s\S]*?<p[^>]*class="[^"]*display-6[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
      const m2 = res.data.match(/<p[^>]*class="[^"]*display-6[^"]*"[^>]*>([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{4,})<\/p>/i);
      const name1 = m1 && m1[1] ? m1[1].replace(/<[^>]+>/g, '').trim() : null;
      const name2 = m2 ? m2[1].trim() : null;
      const nombre = name1 || name2;
      console.log('  Status:', res.status, '| Nombre encontrado:', nombre || 'NO ENCONTRADO', '| dataLen:', res.data.length);
      if (nombre) console.log('  *** ÉXITO ***');
    }
  } catch(e) { console.log('  EXCEPCIÓN:', e.message); }

  // 2. CNE
  console.log('\n[2] CNE Electoral...');
  try {
    const url = `http://www.cne.gob.ve/web/registro_electoral/ce.php?nacs=V&ced=${numOnly}`;
    const res = await httpGet(url, { timeout: 8000 });
    if (res.error) { console.log('  ERROR:', res.error); }
    else {
      const m = res.data.match(/<b>([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{5,})<\/b>/i) ||
                res.data.match(/class="[^"]*negrita[^"]*"[^>]*>([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{5,})/i);
      console.log('  Status:', res.status, '| Nombre:', m ? m[1].trim() : 'NO ENCONTRADO');
      if (m) console.log('  *** ÉXITO ***');
    }
  } catch(e) { console.log('  EXCEPCIÓN:', e.message); }

  // 3. IVSS
  console.log('\n[3] IVSS...');
  try {
    const url = `http://www.ivss.gob.ve:28080/Pensionado/PensionadoCTRL?boton=Consultar&nacionalidad=V&cedula=${numOnly}`;
    const res = await httpGet(url, { encoding: 'latin1', timeout: 7000 });
    if (res.error) { console.log('  ERROR:', res.error); }
    else {
      const m = res.data.match(/Apellido y nombre:.*?<td[^>]*>(.*?)<\/td>/s);
      console.log('  Status:', res.status, '| Nombre:', m && m[1] ? m[1].replace(/<[^>]+>/g,'').trim() : 'NO ENCONTRADO');
      if (m && m[1]) console.log('  *** ÉXITO ***');
    }
  } catch(e) { console.log('  EXCEPCIÓN:', e.message); }

  // 4. MiCedula.net
  console.log('\n[4] MiCedula.net...');
  try {
    const url = `https://micedula.net/cedula/${cedulaFormato}`;
    const res = await httpGet(url, { timeout: 8000 });
    if (res.error) { console.log('  ERROR:', res.error); }
    else {
      const m = res.data.match(/<h[12][^>]*>([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{5,})<\/h[12]>/i) ||
                res.data.match(/class="[^"]*nombre[^"]*"[^>]*>([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{5,})</i) ||
                res.data.match(/<strong>([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{5,})<\/strong>/i);
      console.log('  Status:', res.status, '| Nombre:', m ? m[1].trim() : 'NO ENCONTRADO', '| dataLen:', res.data.length);
      if (m) console.log('  *** ÉXITO ***');
      else if (res.status === 200) {
        // Mostrar un fragmento del HTML para depurar
        const preview = res.data.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().slice(0,300);
        console.log('  Preview texto:', preview);
      }
    }
  } catch(e) { console.log('  EXCEPCIÓN:', e.message); }

  // 5. cedula.com.ve
  console.log('\n[5] cedula.com.ve...');
  try {
    const url = `https://cedula.com.ve/api/v1/cedula/${numOnly}`;
    const res = await httpGet(url, { timeout: 8000 });
    if (res.error) { console.log('  ERROR:', res.error); }
    else {
      console.log('  Status:', res.status, '| Response:', res.data.slice(0, 200));
    }
  } catch(e) { console.log('  EXCEPCIÓN:', e.message); }

  // 6. Intento via cne.gob.ve alternativo (datos.gob.ve)
  console.log('\n[6] APi JSON CNE (cnelib.py-style) ...');
  try {
    const url = `https://eleccion.ve/api/v1/persona/${numOnly}`;
    const res = await httpGet(url, { timeout: 6000 });
    if (res.error) { console.log('  ERROR:', res.error); }
    else {
      console.log('  Status:', res.status, '| Response:', res.data.slice(0, 200));
    }
  } catch(e) { console.log('  EXCEPCIÓN:', e.message); }

  // 7. Intento vecinodigital / apps.cne
  console.log('\n[7] apps.cne.gob.ve...');
  try {
    const url = `http://apps.cne.gob.ve/cedula/consulta.php?cedula=${numOnly}&tipo=V`;
    const res = await httpGet(url, { timeout: 7000 });
    if (res.error) { console.log('  ERROR:', res.error); }
    else {
      console.log('  Status:', res.status, '| Response:', res.data.slice(0, 300).replace(/\s+/g,' '));
    }
  } catch(e) { console.log('  EXCEPCIÓN:', e.message); }
}

async function main() {
  // Probar con cédulas de distintos rangos
  await testAll('V28123456');   // ~28M - joven, puede no estar en ArmandoData
  await testAll('V30987654');   // ~30M - muy reciente
  await testAll('V18452391');   // ~18M - seguro en ArmandoData
  process.exit(0);
}

main().catch(console.error);
