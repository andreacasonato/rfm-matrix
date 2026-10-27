import { readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import { contentSecurityPolicy } from './csp.ts';

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

// Shown in the diagnostics panel (TRD §12): the app version and the day it was built.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const builtOn = new Date().toISOString().slice(0, 10);

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(`${version}, built ${builtOn}`) },
  // Relative asset paths so the build works from a GitHub Pages sub-path.
  base: './',
  plugins: [tailwindcss(), csp],
});
