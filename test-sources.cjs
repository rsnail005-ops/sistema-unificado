const http = require('http');
const https = require('https');

async function testCNE(nacionalidad, num) {
  return new Promise((resolve) => {
    // CNE official search URL
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
        resolve({
          status: res.statusCode,
          data: data
        });
      });
    }).on('error', err => resolve({ error: err.message }));
  });
}

// Also test Seniat
async function testSeniat(rif) {
  return new Promise((resolve) => {
    // SENIAT consulta RIF
    const url = `http://contribuyente.seniat.gob.ve/BuscaRif/BuscaRif.jsp?p_rif=${rif}`;
    http.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 8000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data
        });
      });
    }).on('error', err => resolve({ error: err.message }));
  });
}

async function main() {
  console.log('Testing CNE:');
  const cneRes = await testCNE('V', '28123456');
  console.log('CNE result:', cneRes.status, cneRes.data ? cneRes.data.substring(0, 500) : cneRes.error);

  console.log('\nTesting SENIAT:');
  const seniatRes = await testSeniat('V281234560');
  console.log('SENIAT result:', seniatRes.status, seniatRes.data ? seniatRes.data.substring(0, 500) : seniatRes.error);
}

main();
