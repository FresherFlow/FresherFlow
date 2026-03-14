import { Opportunity } from '@fresherflow/types';
import { cn } from '@/lib/utils';
import CompanyLogo from '@/components/ui/CompanyLogo';
import Link from 'next/link';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import { OpportunityDeadlineBadge } from './OpportunityDeadlineBadge';

interface DetailHeroSectionProps {
    opp: Opportunity;
    isCampusDrive: boolean;
    listingState: string;
    driveDateItems: { label: string; date: Date | null }[];
    driveMeta: any;
    displaySalary: string | null;
    locationInfo: { shortLabel: string; fullLabel: string };
    formatDeadline: (opp: Opportunity) => string | null;
    isExpired: (opp: Opportunity) => boolean;
    isClosingSoon: (opp: Opportunity) => boolean;
}

export function DetailHeroSection({
    opp,
    isCampusDrive,
    listingState,
    driveDateItems,
    driveMeta,
    displaySalary,
    locationInfo,
    formatDeadline,
    isExpired,
    isClosingSoon
}: DetailHeroSectionProps) {
    return (
        <div className="bg-card p-4 md:p-5 rounded-xl border border-border relative overflow-hidden group shadow-sm">
            <div className="relative z-10 space-y-4">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs md:text-sm font-bold uppercase tracking-tight rounded border border-primary/20">
                        {isCampusDrive ? 'CAMPUS DRIVE' : opp.type}
                    </span>
                    {listingState === 'EXPIRED' ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-destructive/5 border border-destructive/10 text-destructive text-xs md:text-sm font-bold uppercase tracking-tight rounded">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            Expired
                        </div>
                    ) : listingState === 'CLOSING_SOON' ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-300 text-amber-700 text-xs md:text-sm font-bold uppercase tracking-tight rounded">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            Closing Soon
                        </div>
                    ) : listingState === 'INACTIVE' ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-muted border border-border text-muted-foreground text-xs md:text-sm font-bold uppercase tracking-tight rounded">
                            <div className="w-2 h-2 rounded-full bg-muted-foreground/70" />
                            Inactive
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-xs md:text-sm font-bold uppercase tracking-tight rounded">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Active
                        </div>
                    )}
                </div>
                {driveDateItems.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        {driveDateItems.map((item) => (
                            <span
                                key={item.label}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/5 text-primary text-xs font-semibold border border-primary/15"
                            >
                                <ClockIcon className="w-3 h-3" />
                                {item.label}: {item.date?.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                        ))}
                    </div>
                )}
                {isCampusDrive && driveMeta.badges.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        {driveMeta.badges.map((badge: string) => (
                            <span
                                key={badge}
                                className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/50 text-foreground text-xs font-semibold border border-border"
                            >
                                {badge}
                            </span>
                        ))}
                    </div>
                )}

                <div className="space-y-1">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground leading-tight">
                        {opp.title}
                    </h1>

                    <div className="flex items-center gap-3">
                        <CompanyLogo
                            companyName={opp.company}
                            companyWebsite={opp.companyWebsite}
                            applyLink={opp.applyLink}
                            className="w-9 h-9 md:w-10 md:h-10 rounded-lg"
                        />
                        <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <h2 className="text-base font-semibold text-foreground tracking-tight leading-none">
                                    <Link href={`/companies/${encodeURIComponent(opp.company)}`} className="hover:text-primary transition-colors">
                                        {opp.company}
                                    </Link>
                                </h2>
                                {opp.jobFunction && (
                                    <span className="text-xs text-muted-foreground font-medium">- {opp.jobFunction}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                                <MapPinIcon className="w-3 h-3" />
                                <span className="font-medium text-sm md:text-base" title={locationInfo.fullLabel}>
                                    {locationInfo.shortLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={cn("pt-3 grid grid-cols-2 gap-2.5", displaySalary ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
                    {displaySalary && (
                        <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Package</p>
                            <p className="font-bold text-base md:text-lg text-foreground truncate">{displaySalary}</p>
                        </div>
                    )}
                    <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employment</p>
                        <p className="font-semibold text-sm md:text-base text-foreground truncate">{opp.employmentType || 'Not specified'}</p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Batch (YEAR)</p>
                        <p className="font-semibold text-sm md:text-base text-foreground leading-snug whitespace-normal">
                            {opp.allowedPassoutYears && opp.allowedPassoutYears.length > 0
                                ? [...opp.allowedPassoutYears].sort((a, b) => (Number(a) - Number(b))).join(', ')
                                : 'Any'}
                        </p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Experience</p>
                        <p className="font-semibold text-sm md:text-base text-foreground truncate">{opp.experienceMax ? `${opp.experienceMin || 0}-${opp.experienceMax}y` : 'Fresher'}</p>
                    </div>
                </div>
                {opp.expiresAt && (
                    <OpportunityDeadlineBadge
                        isExpired={isExpired(opp)}
                        isClosingSoon={isClosingSoon(opp)}
                        deadlineLabel={formatDeadline(opp)}
                    />
                )}
            </div>
        </div>
    );
}
