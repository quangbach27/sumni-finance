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
    rules: {
      'import/no-cycle': 'off',
      'sort-imports': 'off',
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
            // 1. React + TanStack Router
            {
              pattern:
                '{react,react-dom,react-dom/**,@tanstack/react-router,@tanstack/react-router/**}',
              group: 'external',
              position: 'before',
            },
            // 2. Other TanStack (Query, Table, Form...)
            { pattern: '@tanstack/**', group: 'external', position: 'before' },
            // 3. shadcn primitives
            {
              pattern: '@/components/ui{,/**}',
              group: 'internal',
              position: 'before',
            },
            // 4. Layout + shared components
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
