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

    const overflow = skills.length;

    useLayoutEffect(() => {
        const strip = stripRef.current;
        if (!strip) return;

        const metaEls = Array.from(strip.querySelectorAll<HTMLSpanElement>('[data-meta-strip] > span'));
        const skillEls = Array.from(strip.querySelectorAll<HTMLSpanElement>('[data-skill]'));
        const overflowEl = strip.querySelector<HTMLSpanElement>('[data-overflow]');

        setWidths({
            meta: metaEls.map((n) => n.getBoundingClientRect().width),
            skills: skillEls.map((n) => n.getBoundingClientRect().width),
            overflow: overflowEl ? overflowEl.getBoundingClientRect().width : 0,
        });
    }, [metaItems, skills]);

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
                className="pointer-events-none absolute left-[-9999px] top-0 invisible flex items-center gap-2"
            >
                <JobCardBadges metaItems={metaItems} skills={skills} overflow={overflow} measure />
            </div>
        </>
    );
}
