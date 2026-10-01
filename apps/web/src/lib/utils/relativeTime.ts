/**
 * The relative-time formatter behind the shared `timeAgo`.
 *
 * Two modules carried a near-identical private copy that differed in exactly one
 * decision: what to show once something is more than a week old. Notifications
 * fall back to a date; the referral board keeps counting days. Both are
 * deliberate, so the difference is a parameter rather than a second
 * implementation.
 *
 * The vocabulary here is the short one (`3m ago`, `2d ago`). Surfaces that need
 * a different register — the landing strip's uppercase `3M AGO` stamps, or the
 * company hub's prose `today`/`yesterday` — are not this function, and are left
 * as their own small formatters rather than flattened into it.
 */
export type RelativeTimeFallback = 'date' | 'days';

export function formatRelativeTime(
    value: string | number | Date,
    fallback: RelativeTimeFallback = 'date',
): string {
    const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
    // An unparseable timestamp would otherwise render 'Invalid Date' (or 'NaNd ago').
    if (!Number.isFinite(timestamp)) return '';

    const diffMs = Date.now() - timestamp;
    if (diffMs <= 0) return 'just now';

    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (fallback === 'days' || days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
    });
}
