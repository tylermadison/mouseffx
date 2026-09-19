import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'next-env.d.ts',
    // Effect modules move as they are. Their dense style is deliberate.
    'src/lib/mousefx/effects/**',
  ]),
]);
