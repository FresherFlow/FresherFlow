module.exports = {
    env: { node: true },
    extends: 'expo',
    parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
    },
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
};
