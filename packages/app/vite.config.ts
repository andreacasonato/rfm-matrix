import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import { contentSecurityPolicy } from './csp.ts';
import { serviceWorkerSource } from './src/offline/service-worker.ts';

// Build only: the dev server injects inline styles and a live-reload socket the policy blocks.
const csp: Plugin = {
  name: 'content-security-policy',
  apply: 'build',
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy },
      injectTo: 'head-prepend',
    },
  ],
};

// Build only: once every file is written, add sw.js, which keeps all of them for offline use
// (ADR-0020). Public files such as the sample are in the folder by then too.
function offline(): Plugin {
  let outDir = '';
  return {
    name: 'offline',
    apply: 'build',
    configResolved: (config) => {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle: () => {
      const paths = readdirSync(outDir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => relative(outDir, join(entry.parentPath, entry.name)).split(sep).join('/'))
        .filter((path) => path !== 'sw.js')
        .sort();
      const files = paths.map((path) => ({ path, content: readFileSync(join(outDir, path)) }));
      writeFileSync(join(outDir, 'sw.js'), serviceWorkerSource(files));
    },
  };
}

// Shown in the diagnostics panel (TRD §12): the app version and the day it was built.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const builtOn = new Date().toISOString().slice(0, 10);

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(`${version}, built ${builtOn}`) },
  // Relative asset paths so the build works from a GitHub Pages sub-path.
  base: './',
  plugins: [tailwindcss(), csp, offline()],
});
