import Link from 'next/link';
import type { Opportunity } from '@fresherflow/types';
import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import JobCard from '@/features/opportunities/components/JobCard';

interface RecentOpportunitiesProps {
    opportunities: Opportunity[];
}

export function RecentOpportunities({ opportunities }: RecentOpportunitiesProps) {
    const recent = opportunities
        .filter((opportunity) => !opportunity.governmentJobDetails && String(opportunity.type) !== 'GOVERNMENT')
        .slice(0, 4);

    if (recent.length === 0) return null;

    return (
        <section className="py-10 md:py-14 px-6 border-t border-border/40">
            <div className="max-w-6xl mx-auto space-y-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2 max-w-2xl">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                            Recent Opportunities
                        </span>
                        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                            Latest verified openings
                        </h2>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            Fresh listings from the live feed, trimmed for quick scanning before you open the full board.
                        </p>
                    </div>
                    <Link
                        href="/opportunities"
                        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
                    >
                        View All
                        <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {recent.map((opportunity) => (
                        <JobCard
                            key={opportunity.id}
                            job={opportunity}
                            jobId={opportunity.id}
                            variant="compact"
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
