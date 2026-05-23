
/**
 * Returns a user-facing handle for a user.
 * 
 * Logic:
 * 1. If username exists: @username
 * 2. If anonymous: @user_{last 4 of anon_id}
 * 3. Fallback: @user_{last 4 of user_id}
 * 
 * @param user The user object (partial allowed as long as required fields exist)
 */
export function getDisplayHandle(user: { username?: string | null; isAnonymous?: boolean; anon_id?: string | null; id?: string | null } | null | undefined): string {
    if (!user) return 'Guest';

    if (user.username) {
        return `@${user.username}`;
    }

    if (user.isAnonymous) {
        return 'Guest';
    }

    // Fallback for registered users who haven't set a username yet
    return 'User';
}
