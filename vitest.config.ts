import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@sim': path.resolve(import.meta.dirname, 'src/sim'),
      '@game': path.resolve(import.meta.dirname, 'src/game'),
      '@ui': path.resolve(import.meta.dirname, 'src/ui'),
      '@format': path.resolve(import.meta.dirname, 'src/format'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/sim/**/*.ts'],
      exclude: ['src/sim/data/**', 'src/sim/demo.ts', 'src/sim/balance.ts'],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
