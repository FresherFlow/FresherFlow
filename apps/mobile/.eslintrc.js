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
    },
    {
      files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
      parserOptions: {
        project: null,
      },
    },
  ],
};
