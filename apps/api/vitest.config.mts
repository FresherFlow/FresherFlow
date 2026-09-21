import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts'],
        // Route modules are imported dynamically inside each test, so the first
        // case in a file pays cold module-graph resolution (~6s under parallel
        // load) before its assertions run. The 5s default made that suite flaky.
        testTimeout: 20000,
        hookTimeout: 20000,
    },
});
