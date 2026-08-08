"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/ui/Badge';

export interface DirectoryEntity {
  name: string;
  count: number;
  slug: string;
}

interface DirectoryClientProps {
  title: string;
  description: string;
  data: DirectoryEntity[];
  urlPrefix: string;
  entityType?: 'skill' | 'default';
}

import { SKILL_ICON_MAP } from '@/ui/SkillPill';

export function DirectoryClient({ title, description, data, urlPrefix, entityType = 'default' }: DirectoryClientProps) {
  const [search, setSearch] = useState('');

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const lower = search.toLowerCase();
    return data.filter(item => item.name.toLowerCase().includes(lower));
  }, [data, search]);

  const isSearching = search.trim().length > 0;

  // Split into featured vs remaining (if not searching)
  const featured = isSearching ? [] : filteredData.slice(0, 8);
  const remaining = isSearching ? filteredData : filteredData.slice(8);

  // Group remaining
  const groups: Record<string, DirectoryEntity[]> = {};
  for (const item of remaining) {
    const letter = item.name[0].toUpperCase();
    const key = /[A-Z]/.test(letter) ? letter : '#';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  const letters = Object.keys(groups).sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-10">
      {/* Header & Search */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-base text-muted-foreground font-medium max-w-2xl">
            {description}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="default" className="text-xs font-semibold px-3 py-1">
              {data.length} listed
            </Badge>
          </div>
        </div>

        <div className="relative max-w-md">
          <input
            type="text"
            placeholder={`Search ${title.toLowerCase()}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-border bg-card/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Featured Grid */}
      {!isSearching && featured.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Featured</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {featured.map(item => (
              <Link
                key={item.slug}
                href={`${urlPrefix}${item.slug}`}
                className="group flex flex-col p-4 rounded-2xl bg-card border border-border/70 hover:border-primary/40 hover:-translate-y-0.5 transition-all shadow-sm"
              >
                {entityType === 'skill' && (
                  <div className="mb-2">
                    {(() => {
                        const entry = SKILL_ICON_MAP[item.name] || Object.entries(SKILL_ICON_MAP).find(([key]) => item.name.toLowerCase().includes(key.toLowerCase()))?.[1];
                        if (entry) {
                            return (
                                <svg
                                    role="img"
                                    viewBox="0 0 24 24"
                                    className="w-6 h-6 shrink-0"
                                    style={{ fill: entry.colorHex || 'currentColor' }}
                                >
                                    <path d={entry.icon.path} />
                                </svg>
                            );
                        }
                        return <div className="w-6 h-6" />;
                    })()}
                  </div>
                )}
                <span className="text-base font-bold text-foreground capitalize group-hover:text-primary transition-colors line-clamp-1">
                  {item.name}
                </span>
                <span className="text-sm font-medium text-muted-foreground mt-1">
                  {item.count} {item.count === 1 ? 'Job' : 'Jobs'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sticky Jump Nav */}
      {letters.length > 0 && (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/40 py-3 -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex flex-wrap gap-1.5">
            {letters.map(letter => (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold bg-card/50 hover:bg-accent text-foreground hover:text-primary transition-colors shadow-sm border border-border/40"
              >
                {letter}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* A-Z List */}
      <div className="space-y-16 pb-12">
        {letters.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border/50">
            No results found for &quot;{search}&quot;
          </div>
        )}
        
        {letters.map(letter => (
          <div key={letter} id={`letter-${letter}`} className="scroll-mt-32 space-y-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl font-extrabold text-foreground tracking-tighter">{letter}</span>
              <div className="flex-1 h-px bg-border/40" />
            </div>
            <div className="flex flex-wrap gap-2">
              {groups[letter].map(item => (
                <Link
                  key={item.slug}
                  href={`${urlPrefix}${item.slug}`}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border/50 hover:border-primary/60 hover:bg-primary/5 transition-all shadow-sm"
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground capitalize group-hover:text-primary transition-colors">
                    {entityType === 'skill' && (() => {
                        const entry = SKILL_ICON_MAP[item.name] || Object.entries(SKILL_ICON_MAP).find(([key]) => item.name.toLowerCase().includes(key.toLowerCase()))?.[1];
                        if (entry) {
                            return (
                                <svg
                                    role="img"
                                    viewBox="0 0 24 24"
                                    className="w-4 h-4 shrink-0"
                                    style={{ fill: entry.colorHex || 'currentColor' }}
                                >
                                    <path d={entry.icon.path} />
                                </svg>
                            );
                        }
                        return null;
                    })()}
                    {item.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {item.count}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
