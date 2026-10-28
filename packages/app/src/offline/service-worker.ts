// Works offline after the first load (TRD §2, ADR-0020). Used at build time only: the build
// writes `sw.js` from `serviceWorkerSource`, with every file of the app in it.
import { createHash } from 'node:crypto';

type CacheStore = {
  addAll(requests: Request[]): Promise<void>;
  match(key: string | Request, options: { ignoreVary: boolean }): Promise<Response | undefined>;
};

export type ServiceWorkerScope = {
  location: { origin: string; href: string };
  caches: {
    open(name: string): Promise<CacheStore>;
    keys(): Promise<string[]>;
    delete(name: string): Promise<boolean>;
  };
  fetch(request: Request): Promise<Response>;
  addEventListener(
    type: 'install' | 'activate' | 'fetch',
    handler: (event: {
      request: Request;
      waitUntil(promise: Promise<unknown>): void;
      respondWith(response: Promise<Response>): void;
    }) => void,
  ): void;
};

const prefix = 'rfm-matrix-';

/** The worker itself. It runs as written in `sw.js`, through `toString`, so it must not use
 * anything from outside its own body. It never calls skipWaiting: a new version takes over once
 * every tab of the old one is closed, so an open tab never loses its own files. */
export function serviceWorker(scope: ServiceWorkerScope, name: string, files: string[]) {
  scope.addEventListener('install', (event) => {
    // From the server, not the browser's own cache, which may still hold the previous page.
    const fresh = (file: string) =>
      new Request(new URL(file, scope.location.href), { cache: 'reload' });
    event.waitUntil(scope.caches.open(name).then((cache) => cache.addAll(files.map(fresh))));
  });
  scope.addEventListener('activate', (event) => {
    const old = (key: string) => key.startsWith('rfm-matrix-') && key !== name;
    event.waitUntil(
      scope.caches
        .keys()
        .then((keys) => Promise.all(keys.filter(old).map((key) => scope.caches.delete(key)))),
    );
  });
  scope.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET' || new URL(request.url).origin !== scope.location.origin) return;
    // Any page in the app's folder is the app itself, whatever its query string.
    const key = request.mode === 'navigate' ? './' : request;
    // A server may answer with "Vary: Origin", and module scripts send an Origin header that the
    // install requests did not; these are the app's own files, so any stored copy will do.
    event.respondWith(
      scope.caches
        .open(name)
        .then((cache) => cache.match(key, { ignoreVary: true }))
        .then((hit) => hit ?? scope.fetch(request)),
    );
  });
}

export type BuiltFile = { path: string; content: string | Uint8Array };

/** Changes whenever any file's name or content changes, so each build gets its own store. */
export function cacheName(files: BuiltFile[]): string {
  const hash = createHash('sha256');
  for (const { path, content } of files)
    hash.update(path).update('\0').update(content).update('\0');
  return `${prefix}${hash.digest('hex').slice(0, 12)}`;
}

/** The text of `sw.js`: the worker, given its store name and the files to keep. */
export function serviceWorkerSource(files: BuiltFile[]): string {
  const paths = ['./', ...files.map((f) => f.path)];
  return `(${serviceWorker.toString()})(self, ${JSON.stringify(cacheName(files))}, ${JSON.stringify(paths)});\n`;
}
