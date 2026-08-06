'use client';

import { cn } from '@/lib/utils/utils';
import * as si from 'simple-icons';

// Canonical map: skill label → simple-icons slug
export const SKILL_ICON_MAP: Record<string, { icon: si.SimpleIcon; colorHex: string | null }> = {
  'React':             { icon: si.siReact,          colorHex: '#61DAFB' },
  'React Native':      { icon: si.siReact,          colorHex: '#61DAFB' },
  'TypeScript':        { icon: si.siTypescript,     colorHex: '#3178C6' },
  'JavaScript':        { icon: si.siJavascript,     colorHex: '#F7DF1E' },
  'Python':            { icon: si.siPython,          colorHex: '#3776AB' },
  'NodeJS':            { icon: si.siNodedotjs,       colorHex: '#339933' },
  'NextJS':            { icon: si.siNextdotjs,       colorHex: null },      // null = use foreground color
  'Angular':           { icon: si.siAngular,         colorHex: '#DD0031' },
  'VueJS':             { icon: si.siVuedotjs,        colorHex: '#4FC08D' },
  'Django':            { icon: si.siDjango,          colorHex: '#092E20' },
  'PHP':               { icon: si.siPhp,             colorHex: '#777BB4' },
  'Ruby':              { icon: si.siRuby,            colorHex: '#CC342D' },
  'Golang':            { icon: si.siGo,              colorHex: '#00ADD8' },
  '.NET':              { icon: si.siDotnet,          colorHex: '#512BD4' },
  'Kotlin':            { icon: si.siKotlin,          colorHex: '#7F52FF' },
  'Swift':             { icon: si.siSwift,           colorHex: '#F05138' },
  'Android':           { icon: si.siAndroid,         colorHex: '#3DDC84' },
  'iOS':               { icon: si.siIos,             colorHex: null },
  'Docker':            { icon: si.siDocker,          colorHex: '#2496ED' },
  'Kubernetes':        { icon: si.siKubernetes,      colorHex: '#326CE5' },
  'GraphQL':           { icon: si.siGraphql,         colorHex: '#E10098' },
  'PostgreSQL':        { icon: si.siPostgresql,      colorHex: '#4169E1' },
  'MySQL':             { icon: si.siMysql,           colorHex: '#4479A1' },
  'MongoDB':           { icon: si.siMongodb,         colorHex: '#47A248' },
  'Redis':             { icon: si.siRedis,           colorHex: '#DC382D' },
  'Linux':             { icon: si.siLinux,           colorHex: null },
  'Scala':             { icon: si.siScala,           colorHex: '#DC322F' },
  'Shopify':           { icon: si.siShopify,         colorHex: '#96BF48' },
};

interface SkillPillProps {
  skill: string;
  className?: string;
  size?: 'sm' | 'xs';
}

export function SkillPill({ skill, className, size = 'sm' }: SkillPillProps) {
  const entry = SKILL_ICON_MAP[skill] || Object.entries(SKILL_ICON_MAP).find(([key]) => skill.toLowerCase().includes(key.toLowerCase()))?.[1];

  if (entry) {
    const { icon, colorHex } = entry;
    const color = colorHex || 'currentColor';
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md border border-transparent font-medium whitespace-nowrap',
          size === 'xs' ? 'h-5 px-1.5 text-[10px]' : 'h-6 px-2 text-[11px]',
          'bg-muted/60 text-foreground/80',
          className
        )}
      >
        <svg
          role="img"
          viewBox="0 0 24 24"
          className={size === 'xs' ? 'w-2.5 h-2.5 shrink-0' : 'w-3 h-3 shrink-0'}
          style={{ fill: color }}
          aria-label={icon.title}
        >
          <path d={icon.path} />
        </svg>
        {skill}
      </span>
    );
  }

  // Fallback: no icon, just text pill
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-border/50 font-medium whitespace-nowrap bg-muted/40 text-muted-foreground',
        size === 'xs' ? 'h-5 px-1.5 text-[10px]' : 'h-6 px-2 text-[11px]',
        className
      )}
    >
      {skill}
    </span>
  );
}
