import React from 'react';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

interface AdminOpportunitiesFiltersProps {
    search: string;
    setSearch: (v: string) => void;
    typeFilter: string;
    setTypeFilter: (v: string) => void;
    statusFilter: string;
    setStatusFilter: (v: string) => void;
    sort: string;
    setSort: (v: string) => void;
    onClear: () => void;
}

export const AdminOpportunitiesFilters = ({
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    sort,
    setSort,
    onClear
}: AdminOpportunitiesFiltersProps) => {
    return (
        <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/90 backdrop-blur-md md:relative md:top-auto md:z-auto md:mx-0 md:px-0 md:py-0 md:bg-transparent space-y-3">
            <div className="flex flex-col gap-3 md:bg-card md:border md:border-border md:p-4 md:rounded-lg md:flex-row md:items-center md:gap-4 md:shadow-none">
                <div className="relative flex-1 w-full">
                    <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <input
                        placeholder="Search listings..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 flex h-9 w-full rounded-md border border-input bg-secondary/20 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2 w-full md:flex md:w-auto md:gap-2">
                    <div className="hidden md:flex items-center gap-2 text-xs font-medium text-muted-foreground px-2">
                        <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
                        Filters
                    </div>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="h-9 w-full md:w-auto rounded-md border border-input bg-secondary/20 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="">All types</option>
                        <option value="JOB">Jobs</option>
                        <option value="INTERNSHIP">Internships</option>
                        <option value="WALKIN">Walk-ins</option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-9 w-full md:w-auto rounded-md border border-input bg-secondary/20 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="">All status</option>
                        <option value="LIVE">Live</option>
                        <option value="DRAFT">Draft</option>
                        <option value="EXPIRED">Expired</option>
                        <option value="ARCHIVED">Archived</option>
                        <option value="DELETED">Deleted</option>
                    </select>

                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="h-9 w-full md:w-auto rounded-md border border-input bg-secondary/20 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="postedAt_desc">Newest</option>
                        <option value="postedAt_asc">Oldest</option>
                        <option value="company_asc">AZ</option>
                        <option value="company_desc">ZA</option>
                    </select>

                    <button
                        onClick={onClear}
                        className="h-9 px-3 rounded-md border border-input bg-secondary/20 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
};
