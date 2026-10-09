import { defineConfig } from 'tsup';

// ADR-006 — `@tinhome/shared` is bundled into the deployable output; Firebase SDKs stay external.
export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  sourcemap: true,
  clean: true,
  noExternal: ['@tinhome/shared'],
});
