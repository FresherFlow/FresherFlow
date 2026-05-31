module.exports = {
  root: true,
  env: { node: true },
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  extends: 'expo',
  rules: {
    'react/display-name': 'off',
    '@typescript-eslint/array-type': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_'
    }],
    'react-hooks/exhaustive-deps': 'warn',
  },
  ignorePatterns: ['node_modules/', 'dist/', '.expo/', '.turbo/', 'build/'],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        'no-extra-semi': 'off',
      }
    },
    {
      files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
      parserOptions: {
        project: null,
      },
    },
  ],
};
