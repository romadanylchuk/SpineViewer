import { defineConfig } from 'vite';

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
  },
  optimizeDeps: {
    include: ['pixi.js', '@esotericsoftware/spine-pixi-v8', 'jszip'],
  },
});
