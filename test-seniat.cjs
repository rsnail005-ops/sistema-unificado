const http = require('http');

async function testSeniatRedirect(rif) {
  return new Promise((resolve) => {
    const url = `http://contribuyente.seniat.gob.ve/BuscaRif/BuscaRif.jsp?p_rif=${rif}`;
    const req = http.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      console.log('SENIAT headers:', res.headers);
      if (res.headers.location) {
        http.get(res.headers.location, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        }, (res2) => {
          let data = '';
          res2.on('data', c => data += c);
          res2.on('end', () => {
            console.log('Redirect body:', data);
            resolve(data);
          });
        });
      }
    });
  });
}

testSeniatRedirect('V281234560');
