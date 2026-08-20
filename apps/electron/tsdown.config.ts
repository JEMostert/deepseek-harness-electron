import { defineConfig } from 'tsdown'

/**
 * Desktop main process: one ESM bundle. `electron` stays external because the
 * Electron binary provides that module at runtime.
 */
export default defineConfig({
  entry: ['lib/types/main.js'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  deps: {
    neverBundle: ['electron'],
  },
})
