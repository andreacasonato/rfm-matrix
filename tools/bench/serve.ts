// Minimal static file server for the built app, bound to localhost only.
import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize } from 'node:path';

const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

export async function serve(root: string): Promise<{ url: string; server: Server }> {
  const server = createServer(async (request, response) => {
    const path = normalize(new URL(request.url ?? '/', 'http://localhost').pathname);
    const file = join(root, path === '/' ? 'index.html' : path);
    if (!file.startsWith(root)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, {
        'content-type': types[extname(file)] ?? 'application/octet-stream',
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  return { url: `http://127.0.0.1:${port}/`, server };
}
