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
    const [selectedLetter, setSelectedLetter] = useState<string>('all');

    // Extract unique ATS providers present in the dataset (excluding generic "Direct ATS")
    const availableAtsProviders = useMemo(() => {
        const set = new Set<string>();
        for (const co of companies) {
            if (co.atsProvider && !isGenericAts(co.atsProvider)) {
                set.add(co.atsProvider);
            }
        }
        return Array.from(set).sort();
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
            if (selectedLetter !== 'all') {
                const firstChar = co.name[0]?.toUpperCase() || '#';
                const letterKey = /[A-Z]/.test(firstChar) ? firstChar : '#';
                if (letterKey !== selectedLetter) return false;
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
    }, [companies, hiringFilter, selectedAts, selectedLetter, searchQuery]);

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

    const isFilterActive = searchQuery !== '' || hiringFilter !== 'all' || selectedAts !== 'all' || selectedLetter !== 'all';

    const handleResetFilters = () => {
        setSearchQuery('');
        setHiringFilter('all');
        setSelectedAts('all');
        setSelectedLetter('all');
    };

    return (
        <div className="space-y-6">
            {/* Sleek High-Density Page Header */}
            <div className="border-b border-border/60 pb-5 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                            Monitored Companies
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1 font-medium">
                            Explore monitored companies hiring freshers in India. Filter by active openings and ATS recruitment portals.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="default" className="gap-1.5 px-3 py-1 font-semibold">
                            <BriefcaseIcon className="w-3.5 h-3.5" />
                            {totalJobs} Active Roles
                        </Badge>
                        <Badge variant="outline" className="gap-1.5 px-3 py-1 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                            <BuildingOfficeIcon className="w-3.5 h-3.5" />
                            {activeCompaniesCount} Actively Hiring
                        </Badge>
                        <Badge variant="secondary" className="px-3 py-1 font-medium">
                            {companies.length} Monitored
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Interactive Filter Bar */}
            <Card className="p-4 md:p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    {/* Search Input */}
                    <div className="relative md:col-span-6">
                        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                        <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search company by name, slug, or ATS..."
                            className="pl-10 pr-9 h-11"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 z-10"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Hiring Status Toggle */}
                    <div className="flex rounded-xl bg-muted p-1 border border-border md:col-span-3 text-xs font-semibold h-11 items-center">
                        <button
                            type="button"
                            onClick={() => setHiringFilter('all')}
                            className={cn(
                                "flex-1 h-full rounded-lg transition-all text-center flex items-center justify-center px-2 cursor-pointer",
                                hiringFilter === 'all'
                                    ? "bg-card text-foreground shadow-xs font-bold"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            All ({companies.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setHiringFilter('active')}
                            className={cn(
                                "flex-1 h-full rounded-lg transition-all text-center flex items-center justify-center px-2 cursor-pointer",
                                hiringFilter === 'active'
                                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Actively Hiring ({activeCompaniesCount})
                        </button>
                    </div>

                    {/* Radix ATS Dropdown Selector */}
                    <div className="md:col-span-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full h-11 justify-between text-xs font-semibold px-3 bg-background">
                                    <span className="truncate">
                                        {selectedAts === 'all' ? `All ATS (${availableAtsProviders.length})` : selectedAts}
                                    </span>
                                    <ChevronDownIcon className="w-4 h-4 shrink-0 text-muted-foreground ml-1" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem onClick={() => setSelectedAts('all')} className="text-xs font-semibold cursor-pointer">
                                    All ATS Systems ({availableAtsProviders.length})
                                </DropdownMenuItem>
                                {availableAtsProviders.map((ats) => (
                                    <DropdownMenuItem key={ats} onClick={() => setSelectedAts(ats)} className="text-xs font-semibold cursor-pointer">
                                        {ats}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-border/60">
                    <span className="text-xs font-bold text-muted-foreground mr-1 uppercase tracking-wider">Letter:</span>
                    <button
                        type="button"
                        onClick={() => setSelectedLetter('all')}
                        className={cn(
                            "px-2.5 py-1 rounded-md text-xs font-semibold transition-all border cursor-pointer",
                            selectedLetter === 'all'
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted hover:bg-card border-border text-muted-foreground hover:text-foreground"
                        )}
                    >
                        All
                    </button>
                    {allLetters.map((letter) => (
                        <button
                            key={letter}
                            type="button"
                            onClick={() => setSelectedLetter(letter)}
                            className={cn(
                                "w-7 h-7 flex items-center justify-center rounded-md text-xs font-semibold transition-all border cursor-pointer",
                                selectedLetter === letter
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-muted hover:bg-card border-border text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {letter}
                        </button>
                    ))}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground font-medium">
                    <div>
                        Showing <span className="font-bold text-foreground">{filteredCompanies.length}</span> of {companies.length} companies
                    </div>
                    {isFilterActive && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleResetFilters}
                            className="h-auto p-0 text-xs text-primary hover:bg-transparent font-semibold"
                        >
                            <XMarkIcon className="w-3.5 h-3.5 mr-1" />
                            Clear Filters
                        </Button>
                    )}
                </div>
            </Card>

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
                <div className="space-y-8">
                    {activeLetters.map((letter) => (
                        <div key={letter} id={`co-${letter}`} className="scroll-mt-24 space-y-3">
                            <div className="flex items-center gap-2.5">
                                <span className="text-lg font-bold text-foreground">{letter}</span>
                                <Badge variant="secondary" className="text-xs font-bold">
                                    {grouped[letter].length}
                                </Badge>
                                <div className="flex-1 h-px bg-border/60" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                {grouped[letter].map((co) => (
                                    <Link key={co.slug} href={`/companies/${co.slug}`}>
                                        <Card className="group flex items-start gap-3 p-3.5 hover:border-primary/40 hover:bg-accent/30 transition-all cursor-pointer h-full">
                                            <CompanyLogo
                                                companyName={co.name}
                                                companyLogoUrl={co.logoUrl}
                                                companyWebsite={co.website}
                                                className="w-10 h-10 rounded-lg shrink-0"
                                            />
                                            <div className="min-w-0 flex-1 space-y-1">
                                                <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                                    {co.name}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
                                                    {co.count > 0 ? (
                                                        <Badge variant="default" className="text-[10px] py-0 px-2 font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                            {co.count} active {co.count === 1 ? 'role' : 'roles'}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">No active roles</span>
                                                    )}

                                                    {co.atsProvider && !isGenericAts(co.atsProvider) && (
                                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground">
                                                            {co.atsProvider}
                                                        </Badge>
                                                    )}
                                                </div>
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
