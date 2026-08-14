import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'eslint.config.js', 'postcss.config.js', 'tailwind.config.js'] },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              // Everything goes through src/lib/icons.ts. That file is the tree-shaking
              // guarantee (a namespace import here would ship all ~9,000 icons) and the
              // app's icon vocabulary — one name per concept, so "delete" cannot be
              // Trash in one file and TrashSimple in another.
              name: '@phosphor-icons/react',
              message: 'Import icons from @/lib/icons instead — see DESIGN.md §9.1.',
            },
          ],
          patterns: [
            {
              // Components must use useFormat(), so switching language reformats
              // everything and there is one place to fix a formatting bug.
              group: ['**/lib/format', '@/lib/format'],
              importNames: ['formatMoney', 'formatNumber', 'formatDate', 'formatPercent'],
              message: 'Use the useFormat() hook in components.',
            },
          ],
        },
      ],

      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },

  // The one file allowed to reach into Phosphor directly.
  {
    files: ['src/lib/icons.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  // Hooks and tests legitimately consume the raw formatters.
  {
    files: ['src/hooks/useFormat.ts', 'tests/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  { files: ['**/*.js'], extends: [tseslint.configs.disableTypeChecked] },

  prettier,
);
