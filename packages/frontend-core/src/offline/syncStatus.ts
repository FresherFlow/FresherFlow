const FEED_SYNC_KEY = 'ff_last_feed_sync_at';
const DETAIL_SYNC_KEY = 'ff_last_detail_sync_at';

export function markFeedSyncedNow() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(FEED_SYNC_KEY, String(Date.now()));
}

export function markDetailSyncedNow() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DETAIL_SYNC_KEY, String(Date.now()));
}

function readTimestamp(key: string): number | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getFeedLastSyncAt(): number | null {
    return readTimestamp(FEED_SYNC_KEY);
}

export function getDetailLastSyncAt(): number | null {
    return readTimestamp(DETAIL_SYNC_KEY);
}

export function formatSyncTime(timestamp: number | null): string {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
}
