'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/utils';
import { Icon, loadIcons } from '@iconify/react';
import { formatSkillTitleCase } from '@fresherflow/utils';

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
  
  if (!isLoaded) {
    // Return a placeholder of the same size to avoid layout shift while loading
    return <div className={cn("inline-block", className)} aria-hidden="true" />;
  }

  if (!iconName) {
    return <HashtagIcon className={cn("text-muted-foreground", className)} aria-hidden="true" />;
  }
  
  return <Icon icon={iconName} className={className} />;
}

interface SkillPillProps {
  skill: string;
  className?: string;
  size?: 'sm' | 'xs';
}

export function SkillPill({ skill, className, size = 'sm' }: SkillPillProps) {
  const { iconName } = useSkillIcon(skill);

  if (iconName) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border border-transparent font-medium whitespace-nowrap',
          size === 'xs' ? 'h-5 px-1.5 text-[10px]' : 'h-7 px-2.5 text-sm',
          'bg-muted/60 text-foreground/80',
          className
        )}
      >
        <Icon 
          icon={iconName} 
          className={cn(
            'shrink-0', 
            size === 'xs' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5',
            iconName.startsWith('simple-icons:') ? 'text-current' : ''
          )}
        />
        {formatSkillTitleCase(skill)}
      </span>
    );
  }

  // Fallback: no icon, just text pill (also used as loading state)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-border/50 font-medium whitespace-nowrap bg-muted/40 text-muted-foreground',
        size === 'xs' ? 'h-5 px-1.5 text-[10px]' : 'h-7 px-2.5 text-sm',
        className
      )}
    >
      {formatSkillTitleCase(skill)}
    </span>
  );
}
