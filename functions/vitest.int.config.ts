import { defineConfig } from 'vitest/config';

// Integration tests against the emulators (`pnpm test:int` wraps them in emulators:exec).
export default defineConfig({
  test: {
    include: ['test/**/*.int.test.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
