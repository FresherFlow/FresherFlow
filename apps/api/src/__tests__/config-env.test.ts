import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('config env parsing', () => {
    it('allows auth-only imports in test mode without DATABASE_URL', async () => {
        const cwd = path.resolve(__dirname, '..', '..');

        expect(() =>
            execFileSync(
                process.execPath,
                ['-e', "require('@fresherflow/auth')"],
                {
                    cwd,
                    env: {
                        ...process.env,
                        NODE_ENV: 'test',
                        JWT_ACCESS_SECRET: 'test-access-secret',
                        JWT_REFRESH_SECRET: 'test-refresh-secret',
                    },
                    stdio: 'pipe',
                }
            )
        ).not.toThrow();
    });

    it('normalizes flexible APP_MODE values for single-render deployments', () => {
        const cwd = path.resolve(__dirname, '..', '..');

        const run = (appMode: string) =>
            execFileSync(
                process.execPath,
                [
                    '-e',
                    "const { env } = require('@fresherflow/config'); process.stdout.write(env.APP_MODE);",
                ],
                {
                    cwd,
                    env: {
                        ...process.env,
                        NODE_ENV: 'test',
                        APP_MODE: appMode,
                        JWT_ACCESS_SECRET: 'test-access-secret',
                        JWT_REFRESH_SECRET: 'test-refresh-secret',
                    },
                    stdio: 'pipe',
                }
            ).toString();

        expect(run('ALL')).toBe('all');
        expect(run(' user admin ')).toBe('all');
        expect(run('user,admin')).toBe('all');
        expect(run('admin')).toBe('admin');
    });
});
