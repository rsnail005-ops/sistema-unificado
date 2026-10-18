const https = require('https');
const http = require('http');

async function checkArmando(cedula) {
  return new Promise((resolve) => {
    https.get('https://armandodata.com/Personas/Detalles?cedula=' + cedula, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 8000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const match = data.match(/Nombre Completo.*?<p class="info-card-text display-6">(.*?)<\/p>/s);
        resolve({
          source: 'ArmandoData',
          cedula,
          status: res.statusCode,
          found: !!match,
          name: match ? match[1].trim() : null,
          dataLen: data.length
        });
      });
    }).on('error', err => resolve({ source: 'ArmandoData', error: err.message }));
  });
}

// CNE
async function checkCNE(nacionalidad, num) {
  return new Promise((resolve) => {
    const url = `http://www.cne.gob.ve/web/registro_electoral/ce.php?nacs=${nacionalidad}&ced=${num}`;
    http.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 8000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // CNE table parsing
        const match = data.match(/<b[^>]*>(.*?)<\/b>/gi);
        resolve({
          source: 'CNE',
          cedula: nacionalidad + '-' + num,
          status: res.statusCode,
          htmlPreview: data.slice(0, 300)
        });
      });
    }).on('error', err => resolve({ source: 'CNE', error: err.message }));
  });
}

async function run() {
  console.log('Testing ArmandoData:');
  console.log(await checkArmando('V18452391'));
  console.log(await checkArmando('V26000000'));
  console.log(await checkArmando('V27123456'));
  console.log(await checkArmando('V29876543'));
  console.log(await checkArmando('V31234567'));
}

run();
