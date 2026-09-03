import { Opportunity } from '@fresherflow/types';
import { cn } from '@repo/ui/utils/cn';
import CompanyLogo from '@/ui/CompanyLogo';
import { slugify } from '@fresherflow/utils/slugify';
import Link from 'next/link';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import CurrencyRupeeIcon from '@heroicons/react/24/outline/CurrencyRupeeIcon';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import UsersIcon from '@heroicons/react/24/outline/UsersIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';


import { DriveMetadata } from '@/lib/utils/driveTimeline';

function formatEmploymentText(text: string | null | undefined): string {
    if (!text) return 'Not specified';
    const formatted = text.replace(/_/g, ' ');
    return formatted.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function getCompanySlug(companyWebsite?: string | null, companyName?: string): string {
    if (companyWebsite) {
        try {
            const raw = companyWebsite.trim();
            const withProtocol = raw.startsWith('http') ? raw : `https://${raw}`;
            const hostname = new URL(withProtocol).hostname
                .toLowerCase()
                .replace(/^www\./i, '')
                .replace(/^(careers|jobs|talent|work|apply|hr)\./i, '');
            const parts = hostname.split('.');
            const main = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
            if (main && main.length > 1) return main;
        } catch {}
    }
    return slugify(companyName || '');
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
    isMobile?: boolean;
    hasApplyLink?: boolean;
    handleApply?: () => void;
    handleShare?: () => void;
    handleCopyLink?: () => void;
}

export function DetailHeroSection({
    opp,
    isCampusDrive,
    listingState,
    driveDateItems,
    driveMeta,
    displaySalary: _displaySalary,
    locationInfo,
    formatDeadline,
    isExpired,
    isClosingSoon,
    hasApplyLink,
    handleApply,
    handleShare,
    handleCopyLink,
}: DetailHeroSectionProps) {
    const isGovernmentJob = Boolean(opp.governmentJobDetails);
    const govDetails = opp.governmentJobDetails;
    const applicationStart = govDetails?.applicationStartDate;
    const applicationEnd = govDetails?.applicationEndDate;

    return (
        <div className={cn(
            "relative overflow-hidden",
            isGovernmentJob
                ? "rounded-2xl border border-border bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_58%)] p-5 md:p-6"
                : "bg-transparent p-0"
        )}>
            {isGovernmentJob && (
                <>
                    <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,_rgba(20,89,176,0.16),_transparent_55%),linear-gradient(135deg,_rgba(12,56,120,0.96),_rgba(31,95,180,0.92))]" />
                    <div className="absolute -top-12 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                </>
            )}
            <div className="relative z-10 space-y-3">
                {/* Tags row */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-muted/80 text-foreground border border-border/75">
                        {isCampusDrive ? 'Hiring Drive' : opp.type === 'INTERNSHIP' ? 'Internship' : opp.type === 'WALKIN' ? 'Walk-in' : 'Job'}
                    </span>
                    {opp.governmentJobDetails && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-orange-50 dark:bg-orange-500/10 border border-orange-200/50 dark:border-orange-500/20 text-orange-700 dark:text-orange-400">
                            Govt Job
                        </span>
                    )}
                    {listingState === 'EXPIRED' ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-destructive/5 border border-destructive/10 text-destructive text-xs font-semibold rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Expired
                        </span>
                    ) : listingState === 'CLOSING_SOON' ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-700 dark:text-amber-400 text-xs font-semibold rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> Closing soon
                        </span>
                    ) : listingState === 'ACTIVE' ? (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-muted border border-border text-muted-foreground text-xs font-semibold rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/75" />
                            {listingState.charAt(0).toUpperCase() + listingState.slice(1).toLowerCase()}
                        </span>
                    )}
                </div>

                {/* Drive date badges */}
                {driveDateItems.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        {driveDateItems.map((item) => (
                            <span key={item.label} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/5 text-primary text-xs font-semibold border border-primary/15">
                                <ClockIcon className="w-3 h-3" />
                                {item.label}: {item.date?.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                        ))}
                    </div>
                )}

                {isCampusDrive && driveMeta.badges.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        {driveMeta.badges.map((badge: string) => (
                            <span key={badge} className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/50 text-foreground text-xs font-semibold border border-border">
                                {badge}
                            </span>
                        ))}
                    </div>
                )}

                {/* Title + Company */}
                <div className="space-y-2">
                    {isGovernmentJob && (
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                            {govDetails?.recruitingBody || govDetails?.organization || opp.company}
                        </p>
                    )}
                    <h1 className={cn(
                        "font-bold tracking-tight leading-snug",
                        isGovernmentJob
                            ? "text-2xl md:text-4xl text-foreground"
                            : "text-xl md:text-2xl text-foreground"
                    )}>
                        {opp.title}
                    </h1>
                    <div className="flex items-center gap-2.5">
                        <CompanyLogo
                            companyName={opp.company}
                            companyWebsite={opp.companyWebsite}
                            companyLogoUrl={opp.companyLogoUrl}
                            applyLink={opp.applyLink}
                            isGovernment={isGovernmentJob}
                            priority={true}
                            className="w-8 h-8 md:w-9 md:h-9 rounded-lg"
                        />
                        <div className="min-w-0">
                            <Link href={`/companies/${(opp as any).companySlug || getCompanySlug((opp as any).companyWebsite, opp.company)}`} className="text-sm md:text-base font-semibold text-foreground hover:text-primary transition-colors">
                                {opp.company}
                            </Link>
                            <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                                <MapPinIcon className="w-3 h-3 shrink-0" />
                                <span className="text-xs md:text-sm font-medium truncate" title={locationInfo.fullLabel}>
                                    {locationInfo.cities && locationInfo.cities.length > 1
                                        ? locationInfo.cities.join(', ')
                                        : locationInfo.shortLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Government job stats */}
                {isGovernmentJob && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="rounded-xl border border-border bg-card/90 px-3 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vacancies</p>
                            <p className="mt-0.5 text-2xl font-extrabold text-foreground">{govDetails?.vacancyCount ?? 'NA'}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-card/90 px-3 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Opens</p>
                            <p className="mt-0.5 text-sm font-bold text-foreground">{applicationStart || '—'}</p>
                        </div>
                        <div className="rounded-xl border border-rose-200 bg-rose-50/90 px-3 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Last Date</p>
                            <p className="mt-0.5 text-sm font-bold text-rose-900">{applicationEnd || formatDeadline(opp) || '—'}</p>
                        </div>
                    </div>
                )}

                {/* Mobile: inline metadata chips (compact) */}
                <div className="lg:hidden flex flex-wrap gap-1.5 pt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 text-xs font-medium text-foreground border border-border/50">
                        <BriefcaseIcon className="w-3 h-3 text-primary" />
                        {opp.experienceMax ? `${opp.experienceMin || 0}-${opp.experienceMax}y` : 'Fresher'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 text-xs font-medium text-foreground border border-border/50">
                        <UsersIcon className="w-3 h-3 text-primary" />
                        {formatEmploymentText(opp.employmentType)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 text-xs font-medium text-foreground border border-border/50">
                        <CurrencyRupeeIcon className="w-3 h-3 text-primary" />
                        {_displaySalary || 'Competitive'}
                    </span>
                </div>
            </div>
        </div>
    );
}
