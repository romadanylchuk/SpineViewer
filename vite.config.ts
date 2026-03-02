import { defineConfig } from 'vite';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };

export default defineConfig({
  base: '/SpineViewer/',
  server: {
    port: 5173,
  },
  build: {
    target: 'es2020',
  },
  define: {
    __PIXI_VERSION__: '"8"',
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  optimizeDeps: {
    include: ['pixi.js', '@esotericsoftware/spine-pixi-v8', 'jszip'],
  },
});
