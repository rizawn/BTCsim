import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@sim': path.resolve(import.meta.dirname, 'src/sim'),
      '@game': path.resolve(import.meta.dirname, 'src/game'),
      '@ui': path.resolve(import.meta.dirname, 'src/ui'),
      '@format': path.resolve(import.meta.dirname, 'src/format'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: path.resolve(import.meta.dirname, 'index.html'),
    },
  },
  server: {
    port: 8080,
    open: false,
  },
  publicDir: 'public',
});
