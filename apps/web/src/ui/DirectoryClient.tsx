"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/ui/Badge';
import { Input } from '@/ui/Input';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

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

import { SkillIcon } from '@/ui/SkillPill';

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
  const featured = useMemo(() => (isSearching ? [] : filteredData.slice(0, 8)), [isSearching, filteredData]);
  const remaining = useMemo(() => (isSearching ? filteredData : filteredData.slice(8)), [isSearching, filteredData]);

  // Group remaining
  const { groups, letters } = useMemo(() => {
    const grps: Record<string, DirectoryEntity[]> = {};
    for (const item of remaining) {
      const letter = item.name[0].toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : '0-9';
      if (!grps[key]) grps[key] = [];
      grps[key].push(item);
    }

    const ltrs = Object.keys(grps).sort((a, b) => {
      if (a === '0-9') return 1;
      if (b === '0-9') return -1;
      return a.localeCompare(b);
    });

    return { groups: grps, letters: ltrs };
  }, [remaining]);

  return (
    <div className="space-y-10">
      {/* Header & Search */}
      <div className="space-y-6 text-center pt-8 pb-4">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-base text-muted-foreground font-medium max-w-2xl mx-auto pt-1">
            {description}
            <span className="text-sm text-muted-foreground font-medium ml-2">{data.length} listed</span>
          </p>
        </div>

        <div className="relative max-w-md mx-auto">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
          <Input
            type="text"
            placeholder={`Search ${title.toLowerCase()}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 h-11"
          />
        </div>

        {/* Top-Aligned A-Z Navigation */}
        {letters.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 pt-4">
            {letters.map(letter => (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className="w-8 h-8 flex items-center justify-center rounded-md text-xs font-bold border border-border bg-card hover:bg-muted hover:text-foreground transition-colors"
              >
                {letter}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Featured Grid */}
      {!isSearching && featured.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Featured</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {featured.map(item => (
              <Link
                key={item.slug}
                href={`${urlPrefix}${item.slug}`}
                className="group flex flex-col p-4 bg-muted/30 hover:bg-muted/50 border border-border/60 shadow-sm rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  {entityType === 'skill' && (
                    <SkillIcon skill={item.name} className="w-5 h-5 shrink-0" />
                  )}
                  <span className="text-base font-bold text-foreground capitalize group-hover:text-primary transition-colors">
                    {item.name}
                  </span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {item.count} {item.count === 1 ? 'Job' : 'Jobs'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}


      {/* A-Z List */}
      {(letters.length > 0 || search || data.length === 0) && (
        <div className="space-y-16 pb-12">
          {letters.length === 0 && (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border/50">
              No results found{search ? ` for "${search}"` : ''}
            </div>
          )}
          
          {letters.map(letter => (
            <div key={letter} id={`letter-${letter}`} className="scroll-mt-32 space-y-4">
              <div className="flex items-center gap-4 border-b border-border/40 pb-2">
                <h2 className="text-3xl font-extrabold text-foreground">{letter}</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {groups[letter].map(item => (
                  <Link
                    key={item.slug}
                    href={`${urlPrefix}${item.slug}`}
                    className="group flex flex-col p-4 bg-muted/30 hover:bg-muted/50 border border-border/60 shadow-sm rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {entityType === 'skill' && (
                        <SkillIcon skill={item.name} className="w-5 h-5 shrink-0" />
                      )}
                      <span className="text-base font-bold text-foreground capitalize group-hover:text-primary transition-colors">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {item.count} {item.count === 1 ? 'Job' : 'Jobs'}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
