'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@repo/ui/utils/cn';
import { SkillPill } from '@/features/jobs/components/SkillPill';
import type { MetaItem } from './JobCardMetaConfig';

const KEY_BADGE_STYLES: Record<string, string> = {
    salary: 'bg-success/15 border-success/25 text-success dark:text-success',
    education: 'bg-muted/40 text-muted-foreground border-border/50',
    mode: 'bg-signal-aging/15 border-orange-500/25 text-error dark:text-orange-300',
    ats: 'bg-muted/40 text-muted-foreground border-border/50',
};

const KEY_ICON_STYLES: Record<string, string> = {
    salary: 'text-success dark:text-success',
    education: 'text-muted-foreground',
    mode: 'text-destructive dark:text-signal-aging',
    ats: 'text-muted-foreground',
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
        ? 'inline-flex items-center gap-1 rounded-md border px-1.5 h-6 text-xs font-medium whitespace-nowrap shrink-0 min-w-0'
        : 'inline-flex items-center gap-1 rounded-md border px-2 h-6 text-xs font-medium whitespace-nowrap shrink-0 min-w-0';
    const icon = compact ? 'w-3 h-3 shrink-0' : 'w-3 h-3 shrink-0';
    const text = compact ? 'truncate text-xs' : 'truncate text-xs';

    const showSkills = measure || ready;

    const metaNodes = metaItems.map((item) => {
        const keyStyle = item.key ? KEY_BADGE_STYLES[item.key] : undefined;

        const badgeStyle = item.urgent
            ? 'bg-warning/15 border-warning/25 text-warning dark:text-warning'
            : item.fresh
              ? 'bg-primary/15 border-primary/25 text-primary'
              : (keyStyle ?? 'bg-muted/40 text-muted-foreground border-border/50');
        const iconStyle = item.urgent
            ? 'text-warning dark:text-warning'
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
                            ? 'max-w-45 sm:max-w-60'
                            : 'max-w-35 sm:max-w-45',
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
                            className="h-6"
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
                        compact ? 'px-1.5 h-6 text-xs' : 'px-2 h-6 text-xs',
                    )}
                >
                    +{overflow}
                </span>
            )}
        </>
    );
}