/* Zero-dependency static server for local development. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const PORT = Number(process.argv[2] || process.env.PORT || 8080);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.gif': 'image/gif', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.woff2': 'font/woff2',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    if (path === '/' || path === '') path = '/index.html';
    let file = join(ROOT, path);
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    } catch {
      /* Fall back to the shell only for navigations. A missing asset must 404,
         otherwise a broken path silently returns HTML with a 200. */
      if (extname(path)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
      file = join(ROOT, 'index.html');
    }
    const data = await readFile(file);
    /* The service worker script must not be served no-store in some browsers;
       everything else is no-cache so edits show up immediately in development. */
    const isSW = /sw\.js$/.test(file);
    const isMedia = /[/\\]media[/\\]/.test(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      /* Media never changes, so let the browser keep it. */
      'Cache-Control': isMedia ? 'public, max-age=31536000, immutable'
        : isSW ? 'no-cache' : 'no-store, must-revalidate',
      'Service-Worker-Allowed': '/',
    });
    res.end(data);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}).listen(PORT, () => console.log(`Forge running at http://localhost:${PORT}`));
