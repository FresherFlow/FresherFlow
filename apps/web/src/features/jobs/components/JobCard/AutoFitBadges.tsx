'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { useElementSize } from '@/hooks/useResizeObserver';
import { cn } from '@repo/ui/utils/cn';
import { JobCardBadges } from './JobCardBadges';
import { computeVisibleSkillCount } from './skillAutoFit';
import type { MetaItem } from './JobCardMetaConfig';

interface MeasuredWidths {
    meta: number[];
    skills: number[];
    overflow: number;
}

function equalWidths(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((w, i) => w === b[i]);
}

/** Same measurements — the state update (and its re-render) can be skipped. */
function sameWidths(a: MeasuredWidths | null, b: MeasuredWidths): boolean {
    if (!a) return false;
    return a.overflow === b.overflow && equalWidths(a.meta, b.meta) && equalWidths(a.skills, b.skills);
}

/**
 * Renders the meta badges + skills as a single wrapped row and computes exactly
 * how many skills fit the available width (max `maxRows` rows, reserving space
 * for the "+x" overflow chip on the last row) by measuring the real rendered
 * widths — no hardcoded skill count.
 */
export function AutoFitBadges({
    metaItems,
    skills,
    maxRows = 2,
    className,
}: {
    metaItems: MetaItem[];
    skills: string[];
    maxRows?: number;
    className?: string;
}) {
    const { ref: wrapRef, width: wrapWidth } = useElementSize<HTMLDivElement>();
    const stripRef = useRef<HTMLDivElement>(null);
    const [widths, setWidths] = useState<MeasuredWidths | null>(null);
    /**
     * The content last measured. Callers build `metaItems` and `skills` inline
     * from a freshly spread job object, so their identities change on every
     * render — depending on the arrays alone re-ran this effect, and the
     * `getBoundingClientRect` read of every badge inside it, on every unrelated
     * parent render. Measuring only when the badges actually change keeps a long
     * feed from paying a synchronous layout pass per card per render.
     */
    const measuredKeyRef = useRef<string | null>(null);

    const overflow = skills.length;
    const contentKey = `${metaItems.map((m) => `${m.key}\u0001${m.value}`).join('\u0002')}\u0003${skills.join('\u0001')}`;

    useLayoutEffect(() => {
        const strip = stripRef.current;
        if (!strip || measuredKeyRef.current === contentKey) return;
        measuredKeyRef.current = contentKey;

        const metaEls = Array.from(strip.querySelectorAll<HTMLSpanElement>('[data-meta-strip] > span'));
        const skillEls = Array.from(strip.querySelectorAll<HTMLSpanElement>('[data-skill]'));
        const overflowEl = strip.querySelector<HTMLSpanElement>('[data-overflow]');

        const next: MeasuredWidths = {
            meta: metaEls.map((n) => n.getBoundingClientRect().width),
            skills: skillEls.map((n) => n.getBoundingClientRect().width),
            overflow: overflowEl ? overflowEl.getBoundingClientRect().width : 0,
        };

        setWidths((prev) => (sameWidths(prev, next) ? prev : next));
    }, [metaItems, skills, contentKey]);

    const visibleCount =
        widths && skills.length > 0
            ? computeVisibleSkillCount({
                  metaWidths: widths.meta,
                  skillWidths: widths.skills,
                  overflowWidth: widths.overflow,
                  containerWidth: wrapWidth,
                  maxRows,
              })
            : skills.length;

    const ready = Boolean(widths && wrapWidth > 0);
    const fittedSkills = ready && visibleCount >= 0 ? skills.slice(0, visibleCount) : [];
    const skillOverflow = skills.length - fittedSkills.length;

    return (
        <>
            {/* Visible row: meta badges + fitted skills wrap; Apply column is a sibling outside */}
            <div ref={wrapRef} className={cn('flex flex-wrap items-center gap-2 min-w-0 flex-1', className)}>
                <JobCardBadges metaItems={metaItems} skills={fittedSkills} overflow={skillOverflow} ready={ready} />
            </div>

            {/* Hidden measurement strip: same components, offscreen, invisible */}
            <div
                ref={stripRef}
                aria-hidden
                data-measure-strip
                className="pointer-events-none absolute sr-only top-0 invisible flex items-center gap-2"
            >
                <JobCardBadges metaItems={metaItems} skills={skills} overflow={overflow} measure />
            </div>
        </>
    );
}
