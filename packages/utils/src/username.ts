/**
 * Validates a username against the platform rules:
 * - Lowercase only
 * - 3-20 characters
 * - Alphanumeric + underscore only
 */
export function isValidUsername(username: string): { valid: boolean; reason?: string } {
    if (!username) {
        return { valid: false, reason: 'Username is required' };
    }

    if (username.length < 3) {
        return { valid: false, reason: 'Username must be at least 3 characters' };
    }

    if (username.length > 20) {
        return { valid: false, reason: 'Username must be at most 20 characters' };
    }

    if (/[A-Z]/.test(username)) {
        return { valid: false, reason: 'Username must be lowercase' };
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
        return { valid: false, reason: 'Username can only contain lowercase letters, numbers, and underscores' };
    }

    return { valid: true };
}
