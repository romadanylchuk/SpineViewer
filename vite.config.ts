import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
  },
  build: {
    target: 'es2020',
  },
  optimizeDeps: {
    include: ['pixi.js', '@esotericsoftware/spine-pixi-v8', 'jszip'],
  },
});
