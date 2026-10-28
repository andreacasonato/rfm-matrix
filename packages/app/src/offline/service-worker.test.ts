import { describe, expect, it, vi } from 'vitest';
import {
  cacheName,
  type ServiceWorkerScope,
  serviceWorker,
  serviceWorkerSource,
} from './service-worker';

type Handler = (event: {
  request?: { url: string; method: string; mode: string };
  waitUntil(p: Promise<unknown>): void;
  respondWith(p: Promise<unknown>): void;
}) => void;

function fakeScope(stored: Record<string, Record<string, string>> = {}) {
  const handlers: Record<string, Handler> = {};
  const caches = {
    open: vi.fn(async (name: string) => {
      stored[name] ??= {};
      const entries = stored[name];
      return {
        addAll: vi.fn(async (requests: Request[]) => {
          for (const request of requests) {
            expect(request.cache).toBe('reload');
            entries[new URL(request.url).pathname.slice(5) || './'] = `cached ${request.url}`;
          }
        }),
        match: vi.fn(async (key: string | { url: string }, options: object) => {
          expect(options).toEqual({ ignoreVary: true });
          const path = typeof key === 'string' ? key : new URL(key.url).pathname.slice(5);
          return entries[path];
        }),
      };
    }),
    keys: vi.fn(async () => Object.keys(stored)),
    delete: vi.fn(async (name: string) => delete stored[name]),
  };
  const scope = {
    location: { origin: 'https://shop.example', href: 'https://shop.example/app/sw.js' },
    caches,
    fetch: vi.fn(async (request: { url: string }) => `network ${request.url}`),
    addEventListener: (type: string, handler: Handler) => {
      handlers[type] = handler;
    },
  };
  async function dispatch(type: string, request?: { url: string; method?: string; mode?: string }) {
    let waited: Promise<unknown> | undefined;
    let response: Promise<unknown> | undefined;
    handlers[type]?.({
      ...(request ? { request: { method: 'GET', mode: 'cors', ...request } } : {}),
      waitUntil: (p) => {
        waited = p;
      },
      respondWith: (p) => {
        response = p;
      },
    });
    await waited;
    return response;
  }
  return { scope: scope as unknown as ServiceWorkerScope, stored, dispatch, fetch: scope.fetch };
}

const app = 'https://shop.example/app/';

describe('serviceWorker (offline after first load, TRD §2)', () => {
  it('stores every file of the app, fresh from the server, when it installs', async () => {
    const { scope, stored, dispatch } = fakeScope();
    serviceWorker(scope, 'rfm-matrix-new', ['./', 'index.html', 'assets/index-1.js']);
    await dispatch('install');
    expect(Object.keys(stored['rfm-matrix-new'] ?? {})).toEqual([
      './',
      'index.html',
      'assets/index-1.js',
    ]);
  });

  it("deletes older versions' files when it takes over, and nothing else", async () => {
    const { scope, stored, dispatch } = fakeScope({
      'rfm-matrix-old': {},
      'rfm-matrix-new': {},
      'other-app': {},
    });
    serviceWorker(scope, 'rfm-matrix-new', []);
    await dispatch('activate');
    expect(Object.keys(stored).sort()).toEqual(['other-app', 'rfm-matrix-new']);
  });

  it('answers from its store, and asks the network only for what it does not have', async () => {
    const { scope, dispatch } = fakeScope({
      'rfm-matrix-new': { 'assets/index-1.js': 'cached js' },
    });
    serviceWorker(scope, 'rfm-matrix-new', []);
    expect(await dispatch('fetch', { url: `${app}assets/index-1.js` })).toBe('cached js');
    expect(await dispatch('fetch', { url: `${app}assets/missing.js` })).toBe(
      `network ${app}assets/missing.js`,
    );
  });

  it('opens the app page for any page request in its folder', async () => {
    const { scope, dispatch } = fakeScope({ 'rfm-matrix-new': { './': 'cached page' } });
    serviceWorker(scope, 'rfm-matrix-new', []);
    expect(await dispatch('fetch', { url: `${app}?from=bookmark`, mode: 'navigate' })).toBe(
      'cached page',
    );
  });

  it('leaves other hosts and anything but GET to the browser', async () => {
    const { scope, dispatch, fetch } = fakeScope();
    serviceWorker(scope, 'rfm-matrix-new', []);
    expect(await dispatch('fetch', { url: 'https://other.example/x.js' })).toBeUndefined();
    expect(await dispatch('fetch', { url: `${app}x`, method: 'POST' })).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('cacheName', () => {
  it('changes whenever a file name or its content changes', () => {
    const one = cacheName([{ path: 'index.html', content: 'a' }]);
    expect(one).toMatch(/^rfm-matrix-[0-9a-f]{12}$/);
    expect(cacheName([{ path: 'index.html', content: 'a' }])).toBe(one);
    expect(cacheName([{ path: 'index.html', content: 'b' }])).not.toBe(one);
    expect(cacheName([{ path: 'main.html', content: 'a' }])).not.toBe(one);
  });
});

describe('serviceWorkerSource', () => {
  it('is a script that installs the worker with the page folder and every file', async () => {
    const source = serviceWorkerSource([
      { path: 'index.html', content: '<html>' },
      { path: 'assets/index-1.js', content: 'js' },
    ]);
    const { scope, stored, dispatch } = fakeScope();
    new Function('self', source)(scope);
    await dispatch('install');
    const [name] = Object.keys(stored);
    expect(name).toBe(
      cacheName([
        { path: 'index.html', content: '<html>' },
        { path: 'assets/index-1.js', content: 'js' },
      ]),
    );
    expect(Object.keys(stored[name ?? ''] ?? {})).toEqual([
      './',
      'index.html',
      'assets/index-1.js',
    ]);
  });
});
