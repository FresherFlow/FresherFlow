import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const jsRecommended = { ...eslint.configs.recommended, rules: { ...eslint.configs.recommended.rules } };
delete jsRecommended.rules['no-unassigned-vars'];

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', 'eslint.config.mjs', '*.d.ts', '*.d.ts.map', '*.js', '*.js.map'],
  },
  jsRecommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-wrapper-object-types': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': 'off',
      'no-useless-escape': 'off',
      'no-control-regex': 'off',
      'no-irregular-whitespace': 'off',
      'no-constant-condition': 'off'
    },
  },
  {
    files: ['*.js', '*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  }
);
