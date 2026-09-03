'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@repo/ui/utils/cn';
import { SkillPill } from '@/ui/SkillPill';
import type { MetaItem } from './JobCardMetaConfig';

const KEY_BADGE_STYLES: Record<string, string> = {
    salary: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-700 dark:text-emerald-300',
    education: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-700 dark:text-emerald-300',
    mode: 'bg-orange-500/15 border-orange-500/25 text-orange-700 dark:text-orange-300',
    ats: 'bg-violet-500/15 border-violet-500/25 text-violet-700 dark:text-violet-300',
};

const KEY_ICON_STYLES: Record<string, string> = {
    salary: 'text-emerald-600 dark:text-emerald-400',
    education: 'text-emerald-600 dark:text-emerald-400',
    mode: 'text-orange-600 dark:text-orange-400',
    ats: 'text-violet-600 dark:text-violet-400',
};

interface JobCardBadgesProps {
    metaItems: MetaItem[];
    skills: string[];
    overflow?: number;
    compact?: boolean;
    /** Render skill pills only when true (web fit path waits for measurements). */
    ready?: boolean;
    /** Emit data-* hooks for AutoFitBadges measurement (non-interactive). */
    measure?: boolean;
}

export function JobCardBadges({
    metaItems,
    skills,
    overflow = 0,
    compact = false,
    ready = true,
    measure = false,
}: JobCardBadgesProps) {
    const router = useRouter();

    const pill = compact
        ? 'inline-flex items-center gap-1 rounded-md border px-1.5 h-6 text-[11px] font-medium whitespace-nowrap shrink-0 min-w-0'
        : 'inline-flex items-center gap-1.5 rounded-md border px-2.5 h-[26px] text-[13px] font-medium whitespace-nowrap shrink-0 min-w-0';
    const icon = compact ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0';
    const text = compact ? 'truncate text-[11px]' : 'truncate text-[13px]';

    const showSkills = measure || ready;

    const metaNodes = metaItems.map((item) => {
        const keyStyle = item.key ? KEY_BADGE_STYLES[item.key] : undefined;

        const badgeStyle = item.urgent
            ? 'bg-amber-500/15 border-amber-500/25 text-amber-700 dark:text-amber-300'
            : item.fresh
              ? 'bg-primary/15 border-primary/25 text-primary'
              : (keyStyle ?? 'bg-muted/40 text-muted-foreground border-border/50');
        const iconStyle = item.urgent
            ? 'text-amber-600 dark:text-amber-400'
            : item.fresh
              ? 'text-primary'
              : (item.key && KEY_ICON_STYLES[item.key]) || 'text-muted-foreground';

        return (
            <span
                key={item.key}
                className={cn(
                    pill,
                    badgeStyle,
                )}
                title={typeof item.value === 'string' ? item.value : undefined}
            >
                <item.icon className={cn(icon, iconStyle)} aria-hidden />
                <span
                    className={cn(
                        text,
                        item.key === 'education' || item.key === 'venue'
                            ? 'max-w-[180px] sm:max-w-[240px]'
                            : 'max-w-[140px] sm:max-w-[180px]',
                    )}
                >
                    {item.value}
                </span>
            </span>
        );
    });

    return (
        <>
            {measure ? (
                <div data-meta-strip className="flex items-center gap-2">
                    {metaNodes}
                </div>
            ) : (
                metaNodes
            )}

            {showSkills && skills.map((skill) => {
                const pillNode = (
                    <SkillPill
                        skill={skill}
                        size={compact ? 'xs' : 'sm'}
                        hideFallbackIcon={compact}
                        className="hover:bg-muted hover:text-foreground transition-colors"
                    />
                );

                return measure ? (
                    <span key={skill} data-skill>
                        {pillNode}
                    </span>
                ) : (
                    <button
                        key={skill}
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/jobs?skills=${encodeURIComponent(skill)}`);
                        }}
                        className="cursor-pointer outline-none inline-flex items-center"
                    >
                        {pillNode}
                    </button>
                );
            })}

            {showSkills && overflow > 0 && (
                <span
                    data-overflow={measure ? true : undefined}
                    className={cn(
                        'inline-flex items-center font-medium rounded-md bg-muted/40 text-muted-foreground border border-border/50 whitespace-nowrap shrink-0',
                        compact ? 'px-1.5 h-6 text-[11px]' : 'px-2.5 h-[26px] text-[13px]',
                    )}
                >
                    +{overflow}
                </span>
            )}
        </>
    );
}