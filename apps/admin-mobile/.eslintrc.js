module.exports = {
    extends: 'expo',
    rules: {
        'react/display-name': 'off',
        '@typescript-eslint/array-type': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'react-hooks/exhaustive-deps': 'warn',
    },
    ignorePatterns: ['node_modules/', 'dist/', '.expo/', '.turbo/', 'build/'],
};
