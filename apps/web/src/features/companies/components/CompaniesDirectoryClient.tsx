'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { Input } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface CompanyDirectoryItem {
    name: string;
    slug: string;
    count: number;
    logoUrl?: string | null;
    website?: string | null;
    atsProvider?: string | null;
    companyStage?: string | null;
    companySize?: string | null;
    companyIndustry?: string[];
    companyTopics?: string[];
}

interface CompaniesDirectoryClientProps {
    companies: CompanyDirectoryItem[];
    totalJobs: number;
}

function normalizeIndustry(raw: string): string {
    return raw.trim().replace(/\s+/g, ' ');
}

export default function CompaniesDirectoryClient({ companies, totalJobs }: CompaniesDirectoryClientProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndustry, setSelectedIndustry] = useState<string>('all');

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
            if (q !== '') {
                const matchName = co.name.toLowerCase().includes(q);
                const matchSlug = co.slug.toLowerCase().includes(q);
                if (!matchName && !matchSlug) return false;
            }
            return true;
        });
    }, [companies, searchQuery, selectedIndustry]);

    const isFilterActive = searchQuery !== '' || selectedIndustry !== 'all';

    const handleResetFilters = () => {
        setSearchQuery('');
        setSelectedIndustry('all');
    };

    return (
        <div className="space-y-10">
            {/* Header & Search */}
            <div className="space-y-6 text-center pt-8 pb-4">
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                        Monitored Companies
                    </h1>
                    <p className="text-base text-muted-foreground font-medium max-w-2xl mx-auto pt-1">
                        Explore monitored companies hiring freshers in India.
                        <span className="text-sm text-muted-foreground font-medium ml-2">{companies.length} listed</span>
                    </p>
                </div>

                <div className="flex items-center justify-center max-w-xl mx-auto">
                    <div className="relative flex-1 w-full">
                        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                        <Input
                            type="text"
                            placeholder="Search companies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-11"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 z-10"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
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
                        action={
                            <Button variant="outline" size="sm" onClick={handleResetFilters}>
                                Reset All Filters
                            </Button>
                        }
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredCompanies.map((co) => (
                            <Link
                                key={co.slug}
                                href={`/companies/${co.slug}`}
                                className="group flex items-center gap-3 px-4 py-3.5 bg-card hover:bg-muted/50 border border-border/60 rounded-lg transition-colors"
                            >
                                <CompanyLogo
                                    companyName={co.name}
                                    companyLogoUrl={co.logoUrl}
                                    companyWebsite={co.website}
                                    className="!w-9 !h-9 shrink-0"
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
                )}
            </section>
        </div>
    );
}
