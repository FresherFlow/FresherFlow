'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils/utils';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Star } from 'lucide-react';
import { Input } from '@/ui/Input';
import { EmptyState } from '@/ui/EmptyState';
import { PlatformCard } from '@/features/platforms/components/PlatformCard';
import type { InternshipPlatform, PlatformCategory } from '@/features/platforms/types';

export const PLATFORM_CATEGORIES: { key: PlatformCategory | 'All'; label: string }[] = [
    { key: 'All', label: 'All' },
    { key: 'Websites', label: 'Websites' },
    { key: 'Repositories', label: 'Repositories' },
    { key: 'Tools', label: 'Prep Tools' },
    { key: 'Startups', label: 'Startups' },
    { key: 'Research', label: 'Research' },
    { key: 'Government', label: 'Government' },
];

const chipBase = 'h-8 px-3 rounded-lg text-[13px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap select-none cursor-pointer border';
const chipDefault = 'bg-card text-muted-foreground hover:text-foreground hover:border-border border-border/60';
const chipActive = 'bg-muted text-foreground font-semibold border-border';

interface PlatformsPageViewProps {
    resources: InternshipPlatform[];
    lastUpdated?: string;
    title?: string;
    description?: string;
    badge?: string;
}

export function PlatformsPageView({ resources, lastUpdated, title, description, badge }: PlatformsPageViewProps) {
    const [category, setCategory] = useState<PlatformCategory | 'All'>('All');
    const [search, setSearch] = useState('');
    const [recommendedOnly, setRecommendedOnly] = useState(false);

    const counts = useMemo(() => {
        const map: Record<string, number> = { All: resources.length };
        for (const r of resources) map[r.category] = (map[r.category] || 0) + 1;
        return map;
    }, [resources]);

    const filtered = useMemo(() => {
        let result = resources;
        if (category !== 'All') result = result.filter(r => r.category === category);
        if (recommendedOnly) result = result.filter(r => r.isRecommended);
        if (search.trim()) {
            const q = search.toLowerCase().trim();
            result = result.filter(r =>
                r.name.toLowerCase().includes(q) ||
                r.description.toLowerCase().includes(q) ||
                r.tags.some(t => t.toLowerCase().includes(q)) ||
                r.type.toLowerCase().includes(q)
            );
        }
        return result;
    }, [resources, category, search, recommendedOnly]);

    return (
        <div className="w-full max-w-7xl mx-auto px-3 md:px-6 py-3 md:py-5 space-y-4 md:space-y-5">
            {/* Header */}
            <div className="space-y-1.5 md:space-y-2 max-w-3xl">
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight leading-tight">
                    {title || 'Internship Platforms'}
                </h1>
                <p className="text-muted-foreground text-xs md:text-sm leading-relaxed line-clamp-2 md:line-clamp-3">
                    {description || 'Curated platforms, repositories and tools to find internships and prepare for applications — from job boards and GitHub lists to coding practice and research programs.'}
                </p>
                <p className="text-[10px] md:text-xs font-semibold text-muted-foreground pt-1">
                    {resources.length} resources · {lastUpdated ? `Last updated ${lastUpdated}` : 'Updated regularly'}
                </p>
            </div>

            {/* Search + Recommended toggle */}
            <div suppressHydrationWarning className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search platforms, tools, tags..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 h-10 text-sm rounded-xl bg-card border-border shadow-sm w-full"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            aria-label="Clear search"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full p-0.5 hover:bg-muted"
                        >
                            <XMarkIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setRecommendedOnly(v => !v)}
                    className={cn(
                        chipBase,
                        recommendedOnly
                            ? 'bg-primary/10 text-primary border-primary/20 font-semibold'
                            : chipDefault
                    )}
                >
                    <Star className={cn('w-3.5 h-3.5', recommendedOnly && 'fill-current')} />
                    Recommended only
                </button>
            </div>

            {/* Category tabs (hide empty categories) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {PLATFORM_CATEGORIES.filter(cat => cat.key === 'All' || (counts[cat.key] || 0) > 0).map(cat => (
                    <button
                        key={cat.key}
                        onClick={() => setCategory(cat.key)}
                        className={cn(chipBase, category === cat.key ? chipActive : chipDefault)}
                    >
                        {cat.label}
                        <span className={cn(
                            'text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none',
                            category === cat.key ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                        )}>
                            {counts[cat.key] || 0}
                        </span>
                    </button>
                ))}
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <EmptyState
                    title="No platforms found"
                    description="Try a different search or category."
                    size="md"
                    action={
                        <button
                            onClick={() => { setSearch(''); setCategory('All'); setRecommendedOnly(false); }}
                            className="inline-flex items-center justify-center h-10 px-6 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
                        >
                            Clear filters
                        </button>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filtered.map(platform => (
                        <PlatformCard key={platform.url + platform.name} platform={platform} />
                    ))}
                </div>
            )}
        </div>
    );
}
