import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const imageRoot = resolve(root, 'img');
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }

  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (relativePath !== 'index.html' && !relativePath.startsWith('img/')) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    const path = await realpath(resolve(root, relativePath));
    if (path !== resolve(root, 'index.html') && !path.startsWith(imageRoot + sep)) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    const info = await stat(path);
    if (!info.isFile()) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    const body = await readFile(path);
    response.writeHead(200, {
      'Content-Type': types[extname(path).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    const status = error instanceof URIError ? 400 : 404;
    response.writeHead(status);
    response.end(status === 400 ? 'Bad request' : 'Not found');
  }
});

server.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Slow Shine: http://${host}:${server.address().port}`);
});
