const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const root = __dirname;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end('URL inválida'); }
  const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!filename.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Acesso negado'); }
  fs.readFile(filename, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Arquivo não encontrado'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});
let port = Number(process.env.PORT) || 8080;
const lastPort = port + 10;
server.on('error', err => {
  if (err.code === 'EADDRINUSE' && port < lastPort) server.listen(++port, '127.0.0.1');
  else { console.error(err.message); process.exit(1); }
});
server.on('listening', () => {
  const url = `http://127.0.0.1:${port}`;
  console.log(`HYPER-SLEEP / THE PALACE\nJogue em ${url}\nDeixe esta janela aberta. Ctrl+C encerra o servidor.`);
  if (process.argv.includes('--open') && process.platform === 'win32') execFile('cmd.exe', ['/c', 'start', '', url + (process.argv.includes('--editor') ? '/editor.html' : '')]);
});
server.listen(port, '127.0.0.1');
