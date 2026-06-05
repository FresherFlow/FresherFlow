import type { Opportunity } from '@fresherflow/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CompanyLogo from '@/components/ui/CompanyLogo';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import { parseOpportunityLocation } from '@/lib/opportunityDisplay';
import { getOpportunityPathFromItem } from '@/lib/opportunityPath';

type RelatedOpportunitiesProps = {
    relatedOpps: Opportunity[];
    isLoadingRelated: boolean;
};

export function RelatedOpportunities({ relatedOpps, isLoadingRelated }: RelatedOpportunitiesProps) {
    const router = useRouter();

    return (
        <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <span className="w-1 h-4 bg-primary rounded-full" />
                    Related opportunities
                </h2>
                <Link
                    href="/opportunities"
                    className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                >
                    Explore all →
                </Link>
            </div>

            {isLoadingRelated ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : relatedOpps.length === 0 ? (
                <div className="bg-muted/10 border border-border border-dashed rounded-xl p-6 text-center">
                    <p className="text-sm md:text-base text-muted-foreground">No close matches yet. Check full feed for more roles.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {relatedOpps.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => router.push(getOpportunityPathFromItem(item))}
                            className="text-left rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md p-4 transition-all group"
                        >
                            <div className="flex items-start gap-3">
                                <CompanyLogo
                                    companyName={item.company}
                                    companyWebsite={item.companyWebsite}
                                    companyLogoUrl={item.companyLogoUrl}
                                    applyLink={item.applyLink}
                                    isGovernment={item.type === 'GOVERNMENT' || Boolean(item.governmentJobDetails)}
                                    className="w-9 h-9 rounded-lg shrink-0 mt-0.5"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                                        {item.title}
                                    </p>
                                    <p className="text-sm font-medium text-muted-foreground mt-0.5 line-clamp-1">{item.company}</p>
                                    <div className="flex items-center gap-3 mt-3">
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                                            <MapPinIcon className="w-3 h-3" />
                                            {parseOpportunityLocation(item.locations).shortLabel}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-primary font-bold uppercase tracking-tight shrink-0">
                                            {item.type}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
