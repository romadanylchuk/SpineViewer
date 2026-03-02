import { defineConfig } from 'vite';
import path from 'path';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8')) as { version: string };

export default defineConfig({
  root: '.',
  base: '/SpineViewer/',
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
    __APP_VERSION__: JSON.stringify(pkg.version),
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
