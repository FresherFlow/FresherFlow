'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import CompanyLogo from '@/ui/CompanyLogo';
import { Card } from '@/ui/Card';
import { Badge } from '@/ui/Badge';
import { Input } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/ui/DropdownMenu';
import { cn } from '@/ui/cn';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MagnifyingGlassIcon, XMarkIcon, BuildingOfficeIcon, BriefcaseIcon, ChevronDownIcon, FunnelIcon } from '@heroicons/react/24/outline';

export interface CompanyDirectoryItem {
    name: string;
    slug: string;
    count: number;
    logoUrl?: string | null;
    website?: string | null;
    atsProvider?: string | null;
}

interface CompaniesDirectoryClientProps {
    companies: CompanyDirectoryItem[];
    totalJobs: number;
}

function isGenericAts(ats?: string | null): boolean {
    if (!ats) return true;
    const lower = ats.toLowerCase().trim();
    return lower === 'direct ats' || lower === 'official portal' || lower === 'unknown' || lower === 'direct';
}

export default function CompaniesDirectoryClient({ companies, totalJobs }: CompaniesDirectoryClientProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [hiringFilter, setHiringFilter] = useState<'all' | 'active'>('all');
    const [selectedAts, setSelectedAts] = useState<string>('all');

    // Extract unique ATS providers present in the dataset and their counts
    const availableAtsProviders = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const co of companies) {
            if (co.atsProvider && !isGenericAts(co.atsProvider)) {
                counts[co.atsProvider] = (counts[co.atsProvider] || 0) + 1;
            }
        }
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [companies]);

    // Active companies count
    const activeCompaniesCount = useMemo(() => {
        return companies.filter(c => c.count > 0).length;
    }, [companies]);

    // Filtered list
    const filteredCompanies = useMemo(() => {
        return companies.filter((co) => {
            if (hiringFilter === 'active' && co.count <= 0) {
                return false;
            }
            if (selectedAts !== 'all' && co.atsProvider !== selectedAts) {
                return false;
            }
            if (searchQuery.trim() !== '') {
                const q = searchQuery.toLowerCase().trim();
                const matchName = co.name.toLowerCase().includes(q);
                const matchSlug = co.slug.toLowerCase().includes(q);
                const matchAts = co.atsProvider?.toLowerCase().includes(q);
                if (!matchName && !matchSlug && !matchAts) return false;
            }
            return true;
        });
    }, [companies, hiringFilter, selectedAts, searchQuery]);

    // Available letters for letter filter bar
    const allLetters = useMemo(() => {
        const set = new Set<string>();
        for (const co of companies) {
            const letter = co.name[0]?.toUpperCase() || '#';
            set.add(/[A-Z]/.test(letter) ? letter : '#');
        }
        return Array.from(set).sort((a, b) => {
            if (a === '#') return 1;
            if (b === '#') return -1;
            return a.localeCompare(b);
        });
    }, [companies]);

    // Group filtered companies by starting letter
    const grouped = useMemo(() => {
        const groups: Record<string, CompanyDirectoryItem[]> = {};
        for (const co of filteredCompanies) {
            const letter = co.name[0]?.toUpperCase() || '#';
            const key = /[A-Z]/.test(letter) ? letter : '#';
            if (!groups[key]) groups[key] = [];
            groups[key].push(co);
        }
        return groups;
    }, [filteredCompanies]);

    const activeLetters = useMemo(() => {
        return Object.keys(grouped).sort((a, b) => {
            if (a === '#') return 1;
            if (b === '#') return -1;
            return a.localeCompare(b);
        });
    }, [grouped]);

    const isFilterActive = searchQuery !== '' || hiringFilter !== 'all' || selectedAts !== 'all';

    const handleResetFilters = () => {
        setSearchQuery('');
        setHiringFilter('all');
        setSelectedAts('all');
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

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto">
                    <div className="relative flex-1 w-full">
                        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                        <Input
                            type="text"
                            placeholder="Search companies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-10 h-11 bg-card"
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
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-11 px-4 text-sm font-semibold bg-card w-full sm:w-auto shrink-0">
                                <span className="truncate max-w-[140px]">
                                    {selectedAts === 'all' ? `All ATS` : selectedAts}
                                </span>
                                <ChevronDownIcon className="w-4 h-4 ml-2 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => setSelectedAts('all')} className="text-xs font-semibold cursor-pointer flex justify-between">
                                <span>All ATS Systems</span>
                                <span className="text-muted-foreground">{availableAtsProviders.reduce((acc, curr) => acc + curr.count, 0)}</span>
                            </DropdownMenuItem>
                            {availableAtsProviders.map(({ name, count }) => (
                                <DropdownMenuItem key={name} onClick={() => setSelectedAts(name)} className="text-xs font-semibold cursor-pointer flex justify-between">
                                    <span>{name}</span>
                                    <span className="text-muted-foreground">{count}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Top-Aligned A-Z Navigation */}
                {allLetters.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5 pt-4">
                        {allLetters.map((letter) => (
                            <a
                                key={letter}
                                href={`#co-${letter}`}
                                className="w-8 h-8 flex items-center justify-center rounded-md text-xs font-bold border border-border bg-card hover:bg-muted hover:text-foreground transition-colors"
                            >
                                {letter}
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* List */}
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
                <div className="space-y-12">
                    {activeLetters.map((letter) => (
                        <div key={letter} id={`co-${letter}`} className="scroll-mt-36 space-y-4">
                            {/* Header Index */}
                            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                                <h2 className="text-2xl font-bold text-foreground">{letter}</h2>
                                <Badge variant="secondary" className="text-xs">{grouped[letter].length}</Badge>
                            </div>

                            {/* Cards Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {grouped[letter].map((co) => (
                                    <Link key={co.slug} href={`/companies/${co.slug}`}>
                                        <Card className="group flex flex-col p-4 rounded-xl bg-card hover:bg-muted/50 border border-border/60 shadow-sm transition-colors h-full">
                                            <div className="flex items-center gap-3 mb-2">
                                                <CompanyLogo
                                                    companyName={co.name}
                                                    companyLogoUrl={co.logoUrl}
                                                    companyWebsite={co.website}
                                                    className="!w-10 !h-10 rounded-lg border border-border/50 shrink-0"
                                                />
                                                <span className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                                                    {co.name}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
                                                <span>
                                                    {co.count} {co.count === 1 ? 'Active Role' : 'Active Roles'}
                                                </span>
                                                {co.atsProvider && !isGenericAts(co.atsProvider) && (
                                                    <span className="text-xs text-muted-foreground/70 truncate">
                                                        via {co.atsProvider}
                                                    </span>
                                                )}
                                            </div>
                                        </Card>
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
