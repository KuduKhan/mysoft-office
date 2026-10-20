import { createServer } from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { isPublicPath } from './public-paths.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};
const port = Number(process.env.PORT || 4173);
createServer(async (req, res) => {
  try {
    if(!['GET','HEAD'].includes(req.method)){
      res.writeHead(405,{'Allow':'GET, HEAD'});res.end('Method not allowed');return;
    }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if(!isPublicPath(pathname)){
      res.writeHead(404);res.end('Not found');return;
    }
    const target = path.resolve(root, '.' + pathname);
    if (target !== root && !target.startsWith(root + path.sep)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    let file = target;
    try {
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    } catch {
      res.writeHead(404); res.end('Not found'); return;
    }
    const resolvedFile=await realpath(file);
    // Also reject a symlink under src/ or assets/ that escapes the repo.
    if(!resolvedFile.startsWith(root+path.sep)){
      res.writeHead(403);res.end('Forbidden');return;
    }
    const body = await readFile(resolvedFile);
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(400); res.end('Bad request');
  }
}).listen(port, process.env.HOST||'127.0.0.1', () => {
  console.log('MySoft Office available at http://'+(process.env.HOST||'127.0.0.1')+':' + port);
});
