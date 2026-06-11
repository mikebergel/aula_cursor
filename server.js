const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;
const LOG_FILE = path.join(ROOT, 'logs');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
};

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/log') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const { entry } = JSON.parse(body);
        if (!entry || typeof entry !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Entrada inválida' }));
          return;
        }

        fs.appendFileSync(LOG_FILE, `${entry}\n`, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Erro ao salvar log' }));
      }
    });

    return;
  }

  const filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const fullPath = path.join(ROOT, filePath);

  if (!fullPath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(fullPath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Calculadora rodando em http://localhost:${PORT}`);
  console.log(`Logs salvos em: ${LOG_FILE}`);
});
