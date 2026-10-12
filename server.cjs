const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const root = __dirname;
function openBrowser(url) { if (process.argv.includes('--open') && process.platform === 'win32') execFile('cmd.exe', ['/c', 'start', '', url + (process.argv.includes('--editor') ? '/editor.html' : '')]); }
function identifyExisting(port) {
  return new Promise(resolve => {
    const check = (url, fallback = false) => {
      const req = http.get(url, res => { let body = ''; res.setEncoding('utf8'); res.on('data', chunk => body += chunk); res.on('end', () => {
        try { const data = JSON.parse(body); if ((!fallback && data.app === 'palace-engine' && data.workspace === root) || (fallback && data.name === 'hyper-sleep-palace')) return resolve(true); } catch {}
        if (!fallback) check(`http://127.0.0.1:${port}/package.json`, true); else resolve(false);
      }); });
      req.setTimeout(2000, () => req.destroy()); req.on('error', () => resolve(false));
    };
    check(`http://127.0.0.1:${port}/__palace`);
  });
}
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end('URL inválida'); }
  if (pathname === '/__palace') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }); return res.end(JSON.stringify({ app: 'palace-engine', workspace: root })); }
  const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!filename.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Acesso negado'); }
  fs.readFile(filename, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Arquivo não encontrado'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});
const port = Number(process.env.PORT) || 8087;
server.on('error', async err => {
  if (err.code === 'EADDRINUSE' && await identifyExisting(port)) {
    const url = `http://127.0.0.1:${port}`; console.log(`O servidor do Palace ja esta ligado em ${url}`); openBrowser(url); return;
  }
  console.error(err.code === 'EADDRINUSE' ? `A porta ${port} esta sendo usada por outro programa. Feche-o e tente novamente.` : err.message); process.exitCode = 1;
});
server.on('listening', () => {
  const url = `http://127.0.0.1:${port}`;
  console.log(`HYPER-SLEEP / THE PALACE\nJogue em ${url}\nDeixe esta janela aberta. Ctrl+C encerra o servidor.`);
  openBrowser(url);
});
server.listen(port, '127.0.0.1');
