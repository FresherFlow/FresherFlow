export type FunnelEvent =
    | 'DETAIL_VIEW'
    | 'LOGIN_VIEW'
    | 'AUTH_SUCCESS'
    | 'SIGNUP_SUCCESS'
    | 'SAVE_JOB'
    | 'APPLY_CLICK'
    | 'SHARE_JOB'
    | 'SIGNUP_VIEW'
    | 'INSTALL_PROMPT_SHOWN'
    | 'INSTALL_ACCEPTED'
    | 'OPENED_STANDALONE';

export type GrowthWindow = '24h' | '7d' | '30d' | 'all';
export type SourceCounters = Record<FunnelEvent, number>;
type FunnelRow = { source: string; counters: SourceCounters };
type FormattedFunnelRow = {
    source: string;
} & SourceCounters & {
    detailToLoginPct: number;
    loginToAuthPct: number;
};

export function emptyCounters(): SourceCounters {
    return {
        DETAIL_VIEW: 0,
        LOGIN_VIEW: 0,
        AUTH_SUCCESS: 0,
        SIGNUP_SUCCESS: 0,
        SAVE_JOB: 0,
        APPLY_CLICK: 0,
        SHARE_JOB: 0,
        SIGNUP_VIEW: 0,
        INSTALL_PROMPT_SHOWN: 0,
        INSTALL_ACCEPTED: 0,
        OPENED_STANDALONE: 0,
    };
}

export function sanitizeSource(source?: string): string {
    const value = (source || '').trim().toLowerCase();
    if (!value) return 'unknown';
    return value.replace(/[^a-z0-9_-]/g, '').slice(0, 64) || 'unknown';
}

export function normalizeEvent(event?: string): FunnelEvent | null {
    const normalized = (event || '').trim().toUpperCase() as FunnelEvent;
    const allowed: FunnelEvent[] = [
        'DETAIL_VIEW', 'LOGIN_VIEW', 'AUTH_SUCCESS', 'SIGNUP_SUCCESS',
        'SAVE_JOB', 'APPLY_CLICK', 'SHARE_JOB', 'SIGNUP_VIEW',
        'INSTALL_PROMPT_SHOWN', 'INSTALL_ACCEPTED', 'OPENED_STANDALONE',
    ];
    return allowed.includes(normalized) ? normalized : null;
}

export function formatFunnelRows(rows: FunnelRow[]) {
    const sources: FormattedFunnelRow[] = rows.map(({ source, counters }) => {
        const detailToLoginPct = counters.DETAIL_VIEW > 0
            ? Number(((counters.LOGIN_VIEW / counters.DETAIL_VIEW) * 100).toFixed(2))
            : 0;
        const loginToAuthPct = counters.LOGIN_VIEW > 0
            ? Number(((counters.AUTH_SUCCESS / counters.LOGIN_VIEW) * 100).toFixed(2))
            : 0;

        return {
            source,
            ...counters,
            detailToLoginPct,
            loginToAuthPct
        };
    }).sort((a, b) => b.AUTH_SUCCESS - a.AUTH_SUCCESS);

    const totals = sources.reduce((acc: SourceCounters, row) => {
        (Object.keys(acc) as FunnelEvent[]).forEach(k => {
            acc[k] += row[k] || 0;
        });
        return acc;
    }, emptyCounters());

    return { totals, sources };
}
