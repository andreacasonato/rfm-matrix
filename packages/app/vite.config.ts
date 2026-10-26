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

export default defineConfig({
  // Relative asset paths so the build works from a GitHub Pages sub-path.
  base: './',
  plugins: [tailwindcss(), csp],
});
