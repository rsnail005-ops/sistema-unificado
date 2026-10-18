const https = require('https');

async function testCedulaComVe(num) {
  const url = `https://cedula.com.ve/api/v1/cedula/${num}`;
  https.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Body:', data);
    });
  }).on('error', err => console.error(err));
}

testCedulaComVe('28123456');
