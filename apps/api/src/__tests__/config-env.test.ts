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
});
