import { describe, expect, it } from 'vitest';
import { buildInviteUrl } from './share';

describe('buildInviteUrl', () => {
    it('builds a canonical short invite link', () => {
        const url = new URL(buildInviteUrl('https://app.fresherflow.in', 'user_123'));

        expect(`${url.protocol}//${url.host}${url.pathname}`).toBe('https://fresherflow.in/r/USER_123');
        expect(url.search).toBe('');
    });
});
