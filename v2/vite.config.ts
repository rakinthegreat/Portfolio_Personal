import { defineConfig } from 'vite';
import content from './src/content.json' with { type: 'json' };
import { resolve } from 'node:path';
import { renderLite, renderResume } from './src/render.ts';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 700, // three.js lives in its own lazy chunk
    rolldownOptions: { input: { main: resolve(import.meta.dirname, 'index.html'), resume: resolve(import.meta.dirname, 'resume.html') } },
  },
  plugins: [
    {
      name: 'prerender-lite',
      transformIndexHtml(html) {
        return html.replace('<!--LITE-->', renderLite(content)).replace('<!--RESUME-->', renderResume(content));
      },
    },
  ],
});
