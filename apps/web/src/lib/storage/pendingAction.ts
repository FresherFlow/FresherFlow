/**
 * Remembers an action a visitor tried to take before signing in, so it can be
 * replayed once they are authenticated and back on the page they came from.
 *
 * Why this exists: clicking "Save" on a job while logged out sends the user
 * through signup -> username claim -> onboarding. That journey is long enough
 * that by the end nobody remembers wanting one specific job bookmarked. The
 * auth journey already returns them to the right URL; this remembers the
 * *intent*, which the URL cannot carry.
 *
 * The same slot carries the apply hand-off: the interstitial opens the
 * employer's site in a new tab and keeps this one, so nothing in the URL marks
 * "we are waiting on an answer" when the user comes back to the job page.
 *
 * Session storage, not local: a pending save is only meaningful for the tab that
 * asked for it, and leaving it behind would fire a stale action days later.
 */

const KEY = 'ff_pending_action';

/** Fired on every change so mounted consumers can react without a reload. */
const CHANGE_EVENT = 'ff:pending-action-change';

function announceChange() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Subscribe to pending-action changes. Returns an unsubscribe function. */
export function subscribeToPendingAction(onChange: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

/** Expired intents are dropped rather than replayed into the wrong job. */
const MAX_AGE_MS = 30 * 60 * 1000;

export type PendingAction =
    | { type: 'save-job'; jobId: string }
    | { type: 'follow-company'; companyId: string; slug?: string }
    | { type: 'awaiting-apply-confirmation'; jobId: string; jobPath: string };

/**
 * `Omit` does not distribute over a union - `Omit<A | B, 'at'>` collapses to
 * the shared keys and silently drops `jobId`/`companyId`. This variant does.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type PendingActionInput = DistributiveOmit<PendingAction, 'at'>;

function isPendingAction(value: unknown): value is PendingAction {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.type !== 'string' || typeof candidate.at !== 'number') return false;
    if (Date.now() - candidate.at > MAX_AGE_MS) return false;
    if (candidate.type === 'save-job') return typeof candidate.jobId === 'string' && candidate.jobId.length > 0;
    if (candidate.type === 'follow-company') return typeof candidate.companyId === 'string' && candidate.companyId.length > 0;
    if (candidate.type === 'awaiting-apply-confirmation') {
        // jobPath is fed straight into a router.push, so it must be a
        // same-origin relative path — never let a stored value become an
        // absolute URL that walks the user off-site.
        return typeof candidate.jobId === 'string'
            && candidate.jobId.length > 0
            && typeof candidate.jobPath === 'string'
            && candidate.jobPath.startsWith('/')
            && !candidate.jobPath.startsWith('//');
    }
    return false;
}

export function setPendingAction(action: PendingActionInput) {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(KEY, JSON.stringify({ ...action, at: Date.now() }));
    } catch {
        // Private mode / quota. Losing the intent is acceptable; failing the
        // click is not.
    }
    announceChange();
}

/**
 * Reads and clears the stored intent. Destructive on purpose: the same click
 * must not be replayed twice if the page mounts again.
 */
export function takePendingAction(): PendingAction | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.sessionStorage.getItem(KEY);
        if (!raw) return null;
        window.sessionStorage.removeItem(KEY);
        const parsed: unknown = JSON.parse(raw);
        const valid = isPendingAction(parsed) ? parsed : null;
        announceChange();
        return valid;
    } catch {
        return null;
    }
}

export function peekPendingAction(): PendingAction | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.sessionStorage.getItem(KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return isPendingAction(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export function clearPendingAction() {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.removeItem(KEY);
    } catch {
        // no-op
    }
    announceChange();
}
