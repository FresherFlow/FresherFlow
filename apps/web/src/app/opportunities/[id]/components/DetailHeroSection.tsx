import { Opportunity } from '@fresherflow/types';
import { cn } from '@/shared/ui/cn';
import CompanyLogo from '@/components/ui/CompanyLogo';
import { slugify } from '@fresherflow/utils';
import Link from 'next/link';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import { OpportunityDeadlineBadge } from './OpportunityDeadlineBadge';
import { DriveMetadata } from '@/shared/utils/driveTimeline';

function formatEmploymentText(text: string | null | undefined): string {
    if (!text) return 'Not specified';
    const formatted = text.replace(/_/g, ' ');
    return formatted.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

interface DetailHeroSectionProps {
    opp: Opportunity;
    isCampusDrive: boolean;
    listingState: string;
    driveDateItems: { label: string; date: Date | null }[];
    driveMeta: DriveMetadata;
    displaySalary: string | null;
    locationInfo: { shortLabel: string; fullLabel: string; cities?: string[] };
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
    const isGovernmentJob = Boolean(opp.governmentJobDetails);
    const govDetails = opp.governmentJobDetails;
    const applicationStart = govDetails?.applicationStartDate;
    const applicationEnd = govDetails?.applicationEndDate;

    return (
        <div className={cn(
            "relative overflow-hidden group shadow-sm border",
            isGovernmentJob
                ? "rounded-2xl border-slate-200 bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_58%)] p-5 md:p-7"
                : "rounded-xl border-border bg-card p-4 md:p-5"
        )}>
            {isGovernmentJob && (
                <>
                    <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,_rgba(20,89,176,0.16),_transparent_55%),linear-gradient(135deg,_rgba(12,56,120,0.96),_rgba(31,95,180,0.92))]" />
                    <div className="absolute -top-12 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                </>
            )}
            <div className="relative z-10 space-y-4">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cn(
                        "px-2 py-0.5 text-xs md:text-sm font-bold uppercase tracking-tight rounded border",
                        isGovernmentJob
                            ? "bg-white/15 text-slate-900 border-slate-300"
                            : "bg-primary/10 text-primary border-primary/20"
                    )}>
                        {isCampusDrive ? 'CAMPUS DRIVE' : opp.type}
                    </span>
                    {opp.governmentJobDetails && (
                        <span className={cn(
                            "px-2 py-0.5 text-xs md:text-sm font-bold uppercase tracking-tight rounded border",
                            isGovernmentJob
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        )}>
                            GOVT JOB
                        </span>
                    )}
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
                    ) : listingState === 'ACTIVE' ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-xs md:text-sm font-bold uppercase tracking-tight rounded">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Active
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-muted border border-border text-muted-foreground text-xs md:text-sm font-bold uppercase tracking-tight rounded">
                            <div className="w-2 h-2 rounded-full bg-muted-foreground/70" />
                            {listingState}
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
                    {isGovernmentJob && (
                        <p className="text-xs md:text-sm font-bold uppercase tracking-[0.22em] text-slate-600">
                            {govDetails?.recruitingBody || govDetails?.organization || opp.company}
                        </p>
                    )}
                    <h1 className={cn(
                        "font-bold tracking-tight leading-tight",
                        isGovernmentJob
                            ? "text-3xl md:text-5xl text-slate-950"
                            : "text-xl md:text-2xl text-foreground"
                    )}>
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
                                    <Link href={`/companies/${slugify(opp.company)}`} className="hover:text-primary transition-colors">
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
                                    {locationInfo.cities && locationInfo.cities.length > 1
                                        ? locationInfo.cities.join(', ')
                                        : locationInfo.shortLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {isGovernmentJob && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Vacancies</p>
                            <p className="mt-1 text-3xl font-extrabold text-slate-950">
                                {govDetails?.vacancyCount ?? 'NA'}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Applications Open</p>
                            <p className="mt-1 text-lg font-bold text-slate-950">{applicationStart || 'Check notice'}</p>
                        </div>
                        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-4 shadow-sm">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-600">Last Date</p>
                            <p className="mt-1 text-lg font-bold text-rose-900">{applicationEnd || formatDeadline(opp) || 'Check notice'}</p>
                        </div>
                    </div>
                )}

                <div className={cn("pt-3 grid grid-cols-2 gap-2.5", displaySalary ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
                    {displaySalary && (
                        <div className="space-y-0.5">
                            <p className="text-sm font-bold text-foreground/80">Package</p>
                            <p className="text-[15px] md:text-base font-semibold text-foreground truncate">{displaySalary}</p>
                        </div>
                    )}
                    <div className="space-y-0.5">
                        <p className="text-sm font-bold text-foreground/80">Employment</p>
                        <p className="text-[15px] md:text-base font-semibold text-foreground truncate">{formatEmploymentText(opp.employmentType)}</p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-sm font-bold text-foreground/80">Batch (Year)</p>
                        <p className="text-[15px] md:text-base font-semibold text-foreground leading-snug whitespace-normal">
                            {opp.allowedPassoutYears && opp.allowedPassoutYears.length > 0
                                ? [...opp.allowedPassoutYears].sort((a, b) => (Number(a) - Number(b))).join(', ')
                                : 'Any'}
                        </p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-sm font-bold text-foreground/80">Experience</p>
                        <p className="text-[15px] md:text-base font-semibold text-foreground truncate">{opp.experienceMax ? `${opp.experienceMin || 0}-${opp.experienceMax}y` : 'Fresher'}</p>
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
