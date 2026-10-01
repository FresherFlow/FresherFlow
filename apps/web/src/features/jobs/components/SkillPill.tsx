'use client';
/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */

import { useState, useEffect } from 'react';
import { cn } from "@/ui/cn";
import { Icon, loadIcons } from '@iconify/react';

function formatSkillTitleCase(skill: string | null | undefined): string {
    if (!skill) return '';
    return skill.charAt(0).toUpperCase() + skill.slice(1);
}

const ALIAS_MAP: Record<string, string> = {
  'c++': 'cplusplus',
  'c-plus-plus': 'cplusplus',
  'node.js': 'nodejs',
  'node-js': 'nodejs',
  '.net':'dotnet',
  'react native': 'react',
  'html/css': 'html5',
  'html-css': 'html5',
  'vuejs': 'vuejs',
  'nextjs': 'nextjs',
  'nestjs': 'nestjs',
  'nuxtjs': 'nuxtjs',
};

function normalizeSkill(skill: string) {
  const lower = skill.toLowerCase().trim();
  if (ALIAS_MAP[lower]) return ALIAS_MAP[lower];
  return lower.replace(/[^a-z0-9]/g, '');
}

import { HashtagIcon } from '@heroicons/react/24/outline';

export function useSkillIcon(skill: string) {
  const [iconName, setIconName] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const slug = normalizeSkill(skill);
    const icons = [`devicon:${slug}`, `skill-icons:${slug}`, `simple-icons:${slug}`];

    loadIcons(icons, (loaded) => {
      if (!isMounted) return;
      
      const loadedNames = loaded.map(
        (icon) => (icon.provider ? `${icon.provider}:` : '') + `${icon.prefix}:${icon.name}`
      );

      for (const name of icons) {
        if (loadedNames.includes(name)) {
          setIconName(name);
          setIsLoaded(true);
          return;
        }
      }
      
      setIsLoaded(true);
    });
    
    return () => { isMounted = false; };
  }, [skill]);

  return { iconName, isLoaded };
}

export function SkillIcon({ skill, className }: { skill: string; className?: string }) {
  const { iconName, isLoaded } = useSkillIcon(skill);
  return <SkillIconView className={className} iconName={iconName} isLoaded={isLoaded} />;
}

/**
 * Presentational half of `SkillIcon`, split out so a caller that already
 * resolved the icon can render it without calling `useSkillIcon` a second
 * time. `SkillPill` needs the resolved name to pick its colour variant, so
 * it calls the hook itself and renders the icon. It used to render
 * `<SkillIcon>`, which resolved the same skill again - two `useState`
 * pairs, two effects and two `loadIcons` passes per visible pill, on every
 * card in the feed.
 */
function SkillIconView({
  className,
  iconName,
  isLoaded,
}: {
  className?: string;
  iconName: string | null;
  isLoaded: boolean;
}) {
  if (!isLoaded) {
    // Return a placeholder of the same size to avoid layout shift while loading
    return <div className={cn("inline-block", className)} aria-hidden="true" />;
  }

  if (!iconName) {
    return <HashtagIcon className={cn("text-muted-foreground", className)} aria-hidden="true" />;
  }
  
  return <Icon icon={iconName} className={className} />;
}

/**
 * `bare` strips the pill chrome so the surrounding chip/button styling shows
 * through (filter chips, skill dropdown rows).
 */
const BARE_VARIANT = 'bg-transparent border-none p-0 h-auto text-inherit shadow-none';

/**
 * `plain` drops the pill chrome but keeps sizing and truncation, so dense
 * surfaces (the job card meta row) read as text while filter chips and detail
 * pages keep their bordered look.
 */
const PLAIN_VARIANT = 'bg-transparent border-none shadow-none';

interface SkillPillProps {
  skill: string;
  className?: string;
  size?: 'sm' | 'xs';
  variant?: 'default' | 'bare' | 'plain';
  hideFallbackIcon?: boolean;
}

export function SkillPill({ skill, className, size = 'sm', variant = 'default', hideFallbackIcon = false }: SkillPillProps) {
  const { iconName, isLoaded } = useSkillIcon(skill);

  const hasIcon = Boolean(iconName);
  const showIcon = hasIcon || !hideFallbackIcon;
  const isBox = variant === 'default';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap min-w-0 max-w-full overflow-hidden',
        /* `default` is the box-chip treatment: sharp corners on the card surface,
           matching the Key Facts row on the job detail rail. It used to be
           `rounded-md` on `bg-muted/40` at `h-[26px] text-sm`, a softer and
           denser pill than everything around it. Changing it here rather than
           at call sites keeps skills identical in job cards, directories,
           resources, profiles and admin.

           `bare` and `plain` deliberately strip that chrome for filter chips,
           dropdown rows and dense card meta rows, so they keep their original
           metrics - restyling them would resize surfaces nobody asked about. */
        isBox
          ? 'rounded-xs border border-border bg-card px-2.5 py-1.5 text-xs font-semibold'
          : 'rounded-md border font-medium',
        !isBox && (size === 'xs' ? 'h-5 px-1.5 text-xs' : 'h-[26px] px-2.5 text-sm'),
        isBox && (hasIcon ? 'text-foreground' : 'text-muted-foreground'),
        !isBox && (hasIcon ? 'border-transparent bg-muted/40 text-foreground/80' : 'border-border/50 bg-muted/40 text-muted-foreground'),
        variant === 'bare' ? BARE_VARIANT : '',
        variant === 'plain' ? PLAIN_VARIANT : '',
        className
      )}
    >
      {showIcon && (
        <SkillIconView
          className={cn(
            'shrink-0',
            size === 'xs' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5',
            hasIcon && iconName?.startsWith('simple-icons:') ? 'text-current' : ''
          )}
          iconName={iconName}
          isLoaded={isLoaded}
        />
      )}
      <span className="truncate min-w-0">{formatSkillTitleCase(skill)}</span>
    </span>
  );
}
