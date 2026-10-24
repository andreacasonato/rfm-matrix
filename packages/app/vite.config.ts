import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build works from a GitHub Pages sub-path.
  base: './',
  plugins: [tailwindcss()],
});
