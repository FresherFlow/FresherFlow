'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CommentCountMap } from '@fresherflow/types';

/**
 * Batched comment counts for feed cards.
 *
 * One request per feed page (not per card): cards register their ids on
 * mount, the provider coalesces them and fetches
 * GET /api/jobs/comment-counts?ids=... in a single batch. Counts are
 * client-only decoration — SSR renders nothing and missing ids simply
 * render no badge, so the API can stay public and cacheable.
 */

const BATCH_DELAY_MS = 120;
const MAX_IDS_PER_REQUEST = 200;

type Registry = Map<string, (count: number | undefined) => void>;

const CommentCountsContext = createContext<{
    register: (id: string, cb: (count: number | undefined) => void) => void;
    unregister: (id: string, cb: (count: number | undefined) => void) => void;
} | null>(null);

export function CommentCountsProvider({ children }: { children: React.ReactNode }) {
    const registryRef = useRef<Registry>(new Map());
    const pendingRef = useRef<Set<string>>(new Set());
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [counts, setCounts] = useState<CommentCountMap>({});

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const flush = async () => {
        timerRef.current = null;
        const ids = Array.from(pendingRef.current);
        pendingRef.current.clear();
        if (ids.length === 0) return;

        // Defensive split in case a future caller registers a huge list.
        for (let i = 0; i < ids.length; i += MAX_IDS_PER_REQUEST) {
            const batch = ids.slice(i, i + MAX_IDS_PER_REQUEST);
            try {
                const { communityApi } = await import('@fresherflow/api-client');
                const result = await communityApi.getCommentCounts(batch);
                setCounts((prev) => ({ ...prev, ...result.counts }));
            } catch {
                // Counts are decorative; silently skip failed batches.
            }
        }

        // Notify subscribers registered after the fetch was kicked off.
        const registry = registryRef.current;
        for (const [id, cb] of registry) {
            if (counts[id] !== undefined) cb(counts[id]);
        }
    };

    const schedule = () => {
        if (timerRef.current) return;
        timerRef.current = setTimeout(() => void flush(), BATCH_DELAY_MS);
    };

    const register = (id: string, cb: (count: number | undefined) => void) => {
        registryRef.current.set(id, cb);
        if (counts[id] !== undefined) {
            cb(counts[id]);
        } else {
            pendingRef.current.add(id);
            schedule();
        }
    };

    const unregister = (id: string, cb: (count: number | undefined) => void) => {
        if (registryRef.current.get(id) === cb) {
            registryRef.current.delete(id);
        }
    };

    const value = useMemo(() => ({ register, unregister }), [counts]);

    return <CommentCountsContext.Provider value={value}>{children}</CommentCountsContext.Provider>;
}

/**
 * Returns the visible comment count for a job, or undefined while loading /
 * when the job has no comments yet. Renders nothing for undefined so cards
 * without discussion stay clean.
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
        ctx.register(opportunityId, cb);
        return () => ctx.unregister(opportunityId, cb);
    }, [ctx, opportunityId]);

    return count;
}
