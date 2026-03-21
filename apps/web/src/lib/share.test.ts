import { describe, expect, it } from 'vitest';
import { buildInviteUrl } from './share';

describe('buildInviteUrl', () => {
    it('builds a canonical short invite link', () => {
        process.env.NEXT_PUBLIC_SHARE_BASE_URL = 'https://share.test';
        const url = new URL(buildInviteUrl('https://app.test', 'user_123'));

        expect(`${url.protocol}//${url.host}${url.pathname}`).toBe('https://share.test/r/USER_123');
        expect(url.search).toBe('');
    });
});
