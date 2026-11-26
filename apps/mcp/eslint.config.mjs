import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    files: ['src/**/*.ts'],
    extends: [tseslint.configs.recommended, prettier],
  },
  {
    files: ['widget-src/**/*.ts'],
    extends: [tseslint.configs.recommended, prettier],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        matchMedia: 'readonly',
        Intl: 'readonly',
        URL: 'readonly',
      },
    },
  },
  {
    ignores: ['dist/**'],
  }
);
