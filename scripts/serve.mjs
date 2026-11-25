/**
 * Serves little-ledger/ on http://127.0.0.1:8788 for a quick local look.
 * Service workers need localhost, so open the printed address in a browser.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'little-ledger');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const server = createServer(async (request, response) => {
  const { pathname } = new URL(request.url, 'http://127.0.0.1');
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const file = path.join(root, relative);

  if (!file.startsWith(root)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const body = await readFile(file);
    response.writeHead(200, {
      'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    response.end(body);
  } catch (error) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});

server.listen(8788, '127.0.0.1', () => {
  console.log('Ledger on http://127.0.0.1:8788');
});
