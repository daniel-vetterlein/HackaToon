const LIMITE = 10 * 1024; // 10 KB

function lerJson(req) {
  return new Promise((resolve, reject) => {
    const partes = [];
    let tamanho = 0;
    let estourou = false;

    req.on('data', (parte) => {
      tamanho += parte.length;
      if (tamanho > LIMITE) { estourou = true; return; }
      partes.push(parte);
    });

    req.on('end', () => {
      if (estourou) {
        return reject(Object.assign(new Error('Requisição grande demais.'), { status: 413 }));
      }
      try {
        resolve(JSON.parse(Buffer.concat(partes).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('JSON inválido.'), { status: 400 }));
      }
    });

    req.on('error', reject);
  });
}

function json(res, status, corpo) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(corpo));
}

module.exports = { lerJson, json };