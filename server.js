require('./src/db');
const http = require('node:http');
const { tratar } = require('./src/router');

http.createServer(tratar).listen(3000, () => {
  console.log('http://localhost:3000');
});