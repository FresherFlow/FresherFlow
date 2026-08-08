import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const jsRecommended = { ...eslint.configs.recommended, rules: { ...eslint.configs.recommended.rules } };
delete jsRecommended.rules['no-unassigned-vars'];

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', 'eslint.config.mjs', '**/eslint.config.mjs'],
  },
  jsRecommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['*.js', '*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  }
);
