'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CommentCountMap } from '@fresherflow/types';

/**
 * Batched comment counts for feed cards.
 *
 * One request per feed page (not per card): cards register their ids on
 * mount, the provider coalesces them and fetches
 * GET /api/jobs/comment-counts?ids=... in a single batch. Counts hydrate
 * client-side — cards render the `0 discussing` zero-state on SSR and swap
 * in the real count when it arrives, so the API can stay public and cacheable.
 *
 * Counts are held in refs, not state, and the context value is created once.
 * The provider renders nothing but `children`, so a counts update has no
 * business re-rendering anything: each card owns the `useState` that renders
 * its own number, and the batch hands the value straight to that setter
 * through the registry. Keeping counts in state made every batch mint a new
 * context value, which re-ran every card's subscribe effect; because the API
 * omits zero-count ids (see `getCommentCounts`), those cards were queued
 * again and fetched again, forever — a request every BATCH_DELAY_MS plus a
 * re-render of every card in the feed. `requestedRef` also pins "ask once per
 * id" so a card with no comments settles on the zero-state instead of
 * looping.
 */

const BATCH_DELAY_MS = 120;
const MAX_IDS_PER_REQUEST = 200;

type Registry = Map<string, (count: number | undefined) => void>;

interface CommentCountsApi {
    /** Register a card's id. `cb` fires once the batch resolves, or never if the listing has no comments. */
    subscribe: (id: string, cb: (count: number | undefined) => void) => void;
    unsubscribe: (id: string, cb: (count: number | undefined) => void) => void;
}

const CommentCountsContext = createContext<CommentCountsApi | null>(null);

export function CommentCountsProvider({ children }: { children: React.ReactNode }) {
    const registryRef = useRef<Registry>(new Map());
    const pendingRef = useRef<Set<string>>(new Set());
    /** Ids already asked for. The API omits zero-count ids, so "no value yet" must not mean "ask again". */
    const requestedRef = useRef<Set<string>>(new Set());
    const countsRef = useRef<CommentCountMap>({});
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const flush = useCallback(async () => {
        timerRef.current = null;
        const ids = Array.from(pendingRef.current);
        pendingRef.current.clear();
        if (ids.length === 0) return;

        // Defensive split in case a future caller registers a huge list.
        for (let i = 0; i < ids.length; i += MAX_IDS_PER_REQUEST) {
            const batch = ids.slice(i, i + MAX_IDS_PER_REQUEST);
            try {
                const { communityApi } = await import('@/features/jobs/api/community');
                const result = await communityApi.getCommentCounts(batch);
                Object.assign(countsRef.current, result.counts ?? {});
            } catch {
                // Counts are decorative. A failed batch leaves those cards on
                // the zero-state rather than retrying forever.
            }
        }

        // Deliver to everyone currently subscribed, including cards that
        // mounted while the request was in flight.
        const counts = countsRef.current;
        for (const [id, cb] of registryRef.current) {
            const value = counts[id];
            if (value !== undefined) cb(value);
        }
    }, []);

    const subscribe = useCallback(
        (id: string, cb: (count: number | undefined) => void) => {
            registryRef.current.set(id, cb);

            const known = countsRef.current[id];
            if (known !== undefined) {
                cb(known);
                return;
            }

            // Ask once per id. A listing with zero comments never appears in
            // the response, so re-queueing on every subscribe is exactly the
            // loop that never settled.
            if (requestedRef.current.has(id)) return;
            requestedRef.current.add(id);
            pendingRef.current.add(id);

            if (!timerRef.current) {
                timerRef.current = setTimeout(() => void flush(), BATCH_DELAY_MS);
            }
        },
        [flush]
    );

    const unsubscribe = useCallback((id: string, cb: (count: number | undefined) => void) => {
        if (registryRef.current.get(id) === cb) {
            registryRef.current.delete(id);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    // Stable for the life of the provider, so a counts update cannot re-run
    // every subscriber's effect.
    const value = useMemo(() => ({ subscribe, unsubscribe }), [subscribe, unsubscribe]);

    return <CommentCountsContext.Provider value={value}>{children}</CommentCountsContext.Provider>;
}

/**
 * Returns the comment count for a job, or undefined while loading / when the
 * provider is absent. Callers must render the zero-state themselves
 * (`count ?? 0`) so the Discuss CTA exists on SSR before counts hydrate
 * client-side (V1 job-card requirement: Discuss must exist even when N = 0).
 */
export function useCommentCount(opportunityId: string | null | undefined): number | undefined {
    const ctx = useContext(CommentCountsContext);
    const [count, setCount] = useState<number | undefined>(undefined);
    const cbRef = useRef<(count: number | undefined) => void>(() => undefined);

    useEffect(() => {
        cbRef.current = setCount;
    });

    useEffect(() => {
        if (!ctx || !opportunityId) return;
        const cb = (value: number | undefined) => cbRef.current(value);
        ctx.subscribe(opportunityId, cb);
        return () => ctx.unsubscribe(opportunityId, cb);
    }, [ctx, opportunityId]);

    return count;
}
