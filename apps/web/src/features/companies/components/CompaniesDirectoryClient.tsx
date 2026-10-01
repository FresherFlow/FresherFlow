'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { Input } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ui/Select';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { CompanyDirectoryItem } from '@/features/companies/types';

interface CompaniesDirectoryClientProps {
    companies: CompanyDirectoryItem[];
    totalJobs: number;
}

/**
 * How many cards render before "Load more" appears. Sized to the current
 * directory size, so the page looks identical today and only starts paging
 * once the feed grows past it.
 */
const PAGE_SIZE = 36;

const ROLE_BUCKETS = [
    { key: 'all', label: 'All roles' },
    { key: '1-5', label: '1–5 roles' },
    { key: '6-10', label: '6–10 roles' },
    { key: '10+', label: '10+ roles' },
] as const;

type RoleBucket = (typeof ROLE_BUCKETS)[number]['key'];

function inRoleBucket(count: number, bucket: RoleBucket): boolean {
    if (bucket === 'all') return true;
    if (bucket === '1-5') return count <= 5;
    if (bucket === '6-10') return count >= 6 && count <= 10;
    // Strictly above 10. `>= 10` would put a 10-role company in both the
    // "6–10" and "10+" buckets, and a filter that can return a row under two
    // active choices is a bug, not a feature.
    return count > 10;
}

function normalizeIndustry(raw: string): string {
    return raw.trim().replace(/\s+/g, ' ');
}

export default function CompaniesDirectoryClient({ companies, totalJobs }: CompaniesDirectoryClientProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
    const [roleBucket, setRoleBucket] = useState<RoleBucket>('all');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    /* Page-level totals, computed from the unfiltered directory. Both numbers
       come from the same rows the grid renders, so the subtitle can never
       claim a total the page does not show. */
    const totalCompanies = companies.length;
    const totalRoles = useMemo(
        () => companies.reduce((sum, co) => sum + co.count, 0),
        [companies]
    );

    const industries = useMemo(() => {
        const map = new Map<string, { name: string; companies: CompanyDirectoryItem[]; roles: number }>();
        for (const co of companies) {
            for (const raw of co.companyIndustry || []) {
                if (!raw || !raw.trim()) continue;
                const name = normalizeIndustry(raw);
                const key = name.toLowerCase();
                if (!map.has(key)) map.set(key, { name, companies: [], roles: 0 });
                const entry = map.get(key)!;
                entry.companies.push(co);
                entry.roles += co.count;
            }
        }
        return Array.from(map.values())
            .sort((a, b) => b.roles - a.roles || a.name.localeCompare(b.name))
            .slice(0, 9);
    }, [companies]);

    const filteredCompanies = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return companies.filter((co) => {
            if (selectedIndustry !== 'all') {
                const match = (co.companyIndustry || []).some(
                    (ind) => ind.toLowerCase() === selectedIndustry,
                );
                if (!match) return false;
            }
            if (!inRoleBucket(co.count, roleBucket)) return false;
            if (q !== '') {
                const matchName = co.name.toLowerCase().includes(q);
                const matchSlug = co.slug.toLowerCase().includes(q);
                if (!matchName && !matchSlug) return false;
            }
            return true;
        });
    }, [companies, searchQuery, selectedIndustry, roleBucket]);

    const visibleCompanies = filteredCompanies.slice(0, visibleCount);
    const hasMore = filteredCompanies.length > visibleCount;

    const isFilterActive =
        searchQuery !== '' || selectedIndustry !== 'all' || roleBucket !== 'all';

    /* Any filter change resets paging, otherwise a narrower result set could
       open already scrolled past its own end. */
    const handleResetFilters = () => {
        setSearchQuery('');
        setSelectedIndustry('all');
        setRoleBucket('all');
        setVisibleCount(PAGE_SIZE);
    };

    return (
        <div className="space-y-10">
            {/* Header & Search. The outer wrapper already carries the page's
                top padding, so `pt-8` here stacked a second band of empty space
                above the title. */}
            <div className="space-y-5 text-center pb-2">
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                        Companies Hiring Freshers in India
                    </h1>
                    {/* Factual only: the two numbers are summed from the same
                        rows rendered below, so neither can drift from the grid. */}
                    <p className="text-base text-muted-foreground font-medium pt-1">
                        {totalCompanies} {totalCompanies === 1 ? 'company' : 'companies'}
                        <span className="mx-2 text-muted-foreground/50">·</span>
                        {totalRoles.toLocaleString('en-IN')} open {totalRoles === 1 ? 'role' : 'roles'}
                    </p>
                </div>

                {/* `max-w-lg` (~512px) rather than `max-w-xl`. Wide enough to scan,
                    not so wide the caret drifts away from the results. */}
                <div className="mx-auto flex max-w-lg items-center gap-2">
                    <div className="relative min-w-0 flex-1">
                        {/* Icon geometry copied from `JobSearchField`: `left-3` plus
                            a 16px glyph occupies 12–28px, and `pl-9` starts the text
                            at 36px. The base `Input` is only `px-4`, so without it
                            the placeholder ran underneath the icon. The right side
                            mirrors it: the clear button ends at 32px, so the text
                            needs `pr-9` whenever that button is present. */}
                        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                        <Input
                            type="text"
                            placeholder="Search companies..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setVisibleCount(PAGE_SIZE);
                            }}
                            className={`h-11 pl-9 ${searchQuery ? 'pr-9' : 'pr-3'}`}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                aria-label="Clear company search"
                                className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground p-0 z-10"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Role-count filter. The per-company counts are already on
                        every card, so this reads real data rather than inventing a
                        new dimension. */}
                    <Select
                        value={roleBucket}
                        onValueChange={(v) => {
                            setRoleBucket(v as RoleBucket);
                            setVisibleCount(PAGE_SIZE);
                        }}
                    >
                        <SelectTrigger className="h-11 w-36 shrink-0" aria-label="Filter by role count">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ROLE_BUCKETS.map((b) => (
                                <SelectItem key={b.key} value={b.key}>
                                    {b.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Core Industries */}
            {industries.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-foreground">Core Industries</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {industries.map((ind) => {
                            const isActive = selectedIndustry === ind.name.toLowerCase();
                            return (
                                <button
                                    key={ind.name.toLowerCase()}
                                    type="button"
                                    onClick={() => setSelectedIndustry(isActive ? 'all' : ind.name.toLowerCase())}
                                    className={`text-left p-4 bg-card border rounded-lg transition-colors ${
                                        isActive
                                            ? 'border-primary ring-1 ring-ring'
                                            : 'border-border/60 hover:bg-muted/50'
                                    }`}
                                >
                                    <div className="text-sm font-medium text-foreground">{ind.name}</div>
                                    <div className="mt-0.5 text-xs font-medium uppercase tracking-wide tabular-nums text-muted-foreground">
                                        {ind.companies.length} {ind.companies.length === 1 ? 'company' : 'companies'} - {ind.roles.toLocaleString('en-IN')} {ind.roles === 1 ? 'role' : 'roles'}
                                    </div>
                                    <div className="mt-3 flex items-center">
                                        <div className="flex -space-x-2">
                                            {ind.companies.slice(0, 5).map((co) => (
                                                <CompanyLogo
                                                    key={co.slug}
                                                    companyName={co.name}
                                                    companyLogoUrl={co.logoUrl}
                                                    companyWebsite={co.website}
                                                    className="!w-6 !h-6 shrink-0"
                                                />
                                            ))}
                                        </div>
                                        <span className="ml-auto text-xs font-semibold text-muted-foreground">
                                            {isActive ? 'Selected' : `View all ${ind.companies.length}`}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* All companies */}
            <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-foreground">
                        {selectedIndustry === 'all' ? 'All companies' : industries.find((i) => i.name.toLowerCase() === selectedIndustry)?.name || 'All companies'}
                    </h2>
                    {isFilterActive && (
                        <Button variant="outline" size="sm" onClick={handleResetFilters}>
                            Reset
                        </Button>
                    )}
                </div>

                {filteredCompanies.length === 0 ? (
                    <EmptyState
                        title="No companies match your filters"
                        description="Try searching for a different company name or clear active filters."
                        variant="ghost"
                        action={
                            <Button variant="outline" size="sm" onClick={handleResetFilters}>
                                Reset All Filters
                            </Button>
                        }
                    />
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {visibleCompanies.map((co) => (
                                <Link
                                    key={co.slug}
                                    href={`/companies/${co.slug}`}
                                    className="group flex items-center gap-3 px-3.5 py-2.5 bg-card hover:bg-muted/50 border border-border/60 rounded-lg transition-colors"
                                >
                                    <CompanyLogo
                                        companyName={co.name}
                                        companyLogoUrl={co.logoUrl}
                                        companyWebsite={co.website}
                                        className="!w-8 !h-8 shrink-0"
                                    />
                                    <span className="min-w-0 truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                        {co.name}
                                    </span>
                                    <span className="ml-auto shrink-0 whitespace-nowrap text-xs font-medium uppercase tracking-wide tabular-nums text-muted-foreground">
                                        {co.count} {co.count === 1 ? 'role' : 'roles'}
                                    </span>
                                </Link>
                            ))}
                        </div>

                        {/* Only appears once the directory outgrows PAGE_SIZE. */}
                        {hasMore && (
                            <div className="flex justify-center pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                                >
                                    Load more
                                    <span className="ml-2 text-muted-foreground tabular-nums">
                                        {filteredCompanies.length - visibleCompanies.length} remaining
                                    </span>
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}
