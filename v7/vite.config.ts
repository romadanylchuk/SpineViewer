import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  resolve: {
    alias: [
      // Redirect any import of */spine/SpineDisplay to the v7 override
      {
        find: /.*\/spine\/SpineDisplay/,
        replacement: path.resolve(__dirname, 'src/spine/SpineDisplay'),
      },
    ],
  },
  define: {
    __PIXI_VERSION__: '"7"',
  },
  build: {
    outDir: '../dist/v7',
    emptyOutDir: true,
    target: 'es2020',
  },
  server: {
    port: 5174,
    fs: {
      allow: ['..'],
    },
  },
  optimizeDeps: {
    include: ['pixi.js', '@esotericsoftware/spine-pixi-v7', 'jszip'],
  },
});
