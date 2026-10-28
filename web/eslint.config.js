// @ts-check

import { tanstackConfig } from '@tanstack/eslint-config';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  ...tanstackConfig,
  globalIgnores([
    'dist',
    'storybook-static',
    'src/routeTree.gen.ts',
    'eslint.config.js',
    'prettier.config.js',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
      semi: ['warn', 'always'],
      quotes: [
        'warn',
        'single',
        { avoidEscape: true, allowTemplateLiterals: true },
      ],
      'jsx-quotes': ['error', 'prefer-double'],
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
            'object',
            'type',
          ],
          pathGroups: [
            { pattern: 'react', group: 'builtin', position: 'before' },
            { pattern: 'react/**', group: 'builtin', position: 'before' },
            { pattern: 'react-*/**', group: 'builtin', position: 'before' },
            {
              pattern: '@/components/ui/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '@/components/{layout,shared}{,/**}',
              group: 'internal',
              position: 'before',
            },
            // 5. Features
            { pattern: '@/features/**', group: 'internal', position: 'before' },
            // 6. Rest of the alias (lib, hooks, assets...)
            { pattern: '@/**', group: 'internal', position: 'after' },
          ],
          pathGroupsExcludedImportTypes: ['builtin', 'object', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
]);
