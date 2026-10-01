'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@repo/ui/utils/cn';
import { SkillPill } from '@/features/jobs/components/SkillPill';
import type { MetaItem } from './JobCardMetaConfig';

const KEY_BADGE_STYLES: Record<string, string> = {
    salary: 'text-success dark:text-success font-semibold',
    education: 'text-muted-foreground',
    mode: 'text-muted-foreground',
    ats: 'text-muted-foreground',
};

const KEY_ICON_STYLES: Record<string, string> = {
    salary: 'text-success dark:text-success',
    education: 'text-muted-foreground',
    mode: 'text-muted-foreground',
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

    // These three used to branch on `compact` with the same string in both arms.
    // The mobile card's density comes from which badges it is given (two skills,
    // no meta strip) and from `SkillPill`'s size, not from these classes, so the
    // shared pill geometry is stated once.
    const pill = 'inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap shrink-0 min-w-0';
    const icon = 'w-3 h-3 shrink-0';
    const text = 'truncate text-xs';

    const showSkills = measure || ready;

    const metaNodes = metaItems.map((item) => {
        const keyStyle = item.key ? KEY_BADGE_STYLES[item.key] : undefined;

        const badgeStyle = item.urgent
            ? 'text-warning dark:text-warning font-semibold'
            : item.fresh
              ? 'text-primary font-medium'
              : (keyStyle ?? 'text-muted-foreground');
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
                            ? 'max-w-56 sm:max-w-80'
                            : 'max-w-48 sm:max-w-64',
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
                        variant="plain"
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
                        'inline-flex items-center font-medium text-muted-foreground whitespace-nowrap shrink-0',
                        compact ? 'px-1.5 text-xs' : 'px-2 text-xs',
                    )}
                >
                    +{overflow}
                </span>
            )}
        </>
    );
}