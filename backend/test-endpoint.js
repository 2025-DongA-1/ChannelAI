const http = require('http');
const fs = require('fs');

const data = JSON.stringify({ htmlContent: '<h1>Test PDF</h1>', filename: 'test.pdf' });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/report/pdf',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    // we don't have a valid auth token, wait...
  }
};

const req = http.request(options, res => {
  console.log('STATUS:', res.statusCode);
  const chunks = [];
  res.on('data', d => chunks.push(d));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    fs.writeFileSync('output.pdf', buffer);
    console.log('Saved output.pdf size:', buffer.length);
  });
});
req.write(data);
req.end();
