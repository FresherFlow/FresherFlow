"use strict";
// @fresherflow/domain — Referral Domain
// Logic for invite links and codes.
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildInviteUrl = buildInviteUrl;
/**
 * Builds a referral/invite URL for a user.
 * Uses the canonical share base for consistent social previews.
 */
function buildInviteUrl(referralCode, options = {}) {
    const base = options.shareBase || 'https://fresherflow.in';
    const cleanBase = base.replace(/\/$/, '');
    return `${cleanBase}/r/${referralCode.toUpperCase()}`;
}
