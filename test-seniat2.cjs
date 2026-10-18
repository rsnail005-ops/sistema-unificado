const https = require('https');

async function testSeniatHttps(rif) {
  const url = `https://contribuyente.seniat.gob.ve/BuscaRif/BuscaRif.jsp?p_rif=${rif}`;
  https.get(url, {
    rejectUnauthorized: false,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Body:', data);
    });
  }).on('error', err => console.error(err));
}

testSeniatHttps('V281234560');
