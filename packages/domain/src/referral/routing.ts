// @fresherflow/domain — Referral Domain
// Logic for invite links and codes.

/**
 * Builds a referral/invite URL for a user.
 * Uses the canonical share base for consistent social previews.
 */
export function buildInviteUrl(referralCode: string, options: { shareBase?: string } = {}) {
    const base =
        options.shareBase ||
        process.env.NEXT_PUBLIC_SHARE_BASE_URL ||
        process.env.SHARE_BASE_URL ||
        '';
    const cleanBase = base.replace(/\/$/, '');
    return `${cleanBase}/r/${referralCode.toUpperCase()}`;
}
