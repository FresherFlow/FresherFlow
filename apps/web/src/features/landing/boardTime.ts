/**
 * Board time: the chalk-line timestamps on the landing surface (plan 17 §17.1.4).
 *
 * Local to the landing feature on purpose — there is no shared relative-time
 * helper in packages/utils today and this is not yet a third use case
 * (planning rule: no abstraction before three proven uses).
 */
export function formatBoardTime(value: Date | string | null | undefined): string {
    if (!value) return '';
    const then = value instanceof Date ? value.getTime() : Date.parse(value);
    if (!Number.isFinite(then)) return '';

    const diffMs = Date.now() - then;
    if (diffMs < 0) return 'just now';

    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;

    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}
