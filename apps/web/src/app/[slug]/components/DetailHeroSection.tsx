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
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import LinkIcon from '@heroicons/react/24/outline/LinkIcon';

import { DriveMetadata } from '@/lib/utils/driveTimeline';

function getPostedLabel(postedAtVal?: string | Date | null) {
    const postedAt = postedAtVal ? new Date(postedAtVal) : null;
    if (!postedAt || Number.isNaN(postedAt.getTime())) return '';
    const diff = Date.now() - postedAt.getTime();
    const days = Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
    const formattedDate = postedAt.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
    if (days === 0) return `Today (${formattedDate})`;
    if (days === 1) return `Yesterday (${formattedDate})`;
    return `${days} days ago (${formattedDate})`;
}

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
            "relative overflow-hidden group",
            isGovernmentJob
                ? "rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_58%)] p-5 md:p-7"
                : "bg-transparent p-0" // transparent and borderless for standard listing pages inside top-banner
        )}>
            {isGovernmentJob && (
                <>
                    <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,_rgba(20,89,176,0.16),_transparent_55%),linear-gradient(135deg,_rgba(12,56,120,0.96),_rgba(31,95,180,0.92))]" />
                    <div className="absolute -top-12 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                </>
            )}
            <div className="relative z-10 space-y-4">
                <div className="flex flex-wrap items-center gap-1.5 select-none">
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-muted/80 text-foreground border border-border/75">
                        {isCampusDrive ? 'Hiring Drive' : opp.type === 'INTERNSHIP' ? 'Internship' : opp.type === 'WALKIN' ? 'Walk-in' : 'Job'}
                    </span>
                    {opp.governmentJobDetails && (
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-orange-50 dark:bg-orange-500/10 border border-orange-200/50 dark:border-orange-500/20 text-orange-700 dark:text-orange-400">
                            Govt Job
                        </span>
                    )}
                    {listingState === 'EXPIRED' ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-destructive/5 border border-destructive/10 text-destructive text-xs font-semibold rounded-md">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Expired
                        </div>
                    ) : listingState === 'CLOSING_SOON' ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-700 dark:text-amber-400 text-xs font-semibold rounded-md">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                            Closing soon
                        </div>
                    ) : listingState === 'ACTIVE' ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-md">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-muted border border-border text-muted-foreground text-xs font-semibold rounded-md">
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/75" />
                            {listingState.charAt(0).toUpperCase() + listingState.slice(1).toLowerCase()}
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

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6">
                    <div className="space-y-1.5 min-w-0 flex-1">
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
                                companyLogoUrl={opp.companyLogoUrl}
                                applyLink={opp.applyLink}
                                isGovernment={isGovernmentJob}
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
                                        <span className="text-xs text-muted-foreground font-medium">
                                            - {opp.jobFunction}
                                        </span>
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

                    {/* Action buttons rendered right-side inside the full-width banner */}
                    <div className="hidden md:flex items-center gap-2 pt-2 shrink-0">
                        {hasApplyLink && (
                            listingState === 'EXPIRED' ? (
                                <div className="px-4 h-11 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-xs font-bold flex items-center justify-center gap-1.5 min-w-[130px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                                    Closed
                                </div>
                            ) : (
                                <button
                                    onClick={handleApply}
                                    className="px-5 h-11 text-xs bg-primary text-primary-foreground hover:bg-primary/95 active:scale-[0.99] rounded-xl flex items-center justify-center gap-1.5 font-bold shadow-md hover:shadow-lg transition-all"
                                >
                                    Apply Now
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                    </svg>
                                </button>
                            )
                        )}
                        {handleShare && (
                            <button
                                onClick={handleShare}
                                className="p-3 rounded-xl border border-border bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground active:scale-[0.98] transition-all"
                                aria-label="Share"
                            >
                                <ShareIcon className="w-4 h-4" />
                            </button>
                        )}
                        {handleCopyLink && (
                            <button
                                onClick={handleCopyLink}
                                className="p-3 rounded-xl border border-border bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground active:scale-[0.98] transition-all"
                                aria-label="Copy Link"
                            >
                                <LinkIcon className="w-4 h-4" />
                            </button>
                        )}
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

                {/* Metadata boxes: visible on mobile/tablet, hidden on desktop */}
                <div className="grid grid-cols-2 lg:hidden gap-3 border-t border-border/40 pt-4 mt-4">
                    <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex items-start gap-2.5 min-h-[64px] min-w-0">
                        <BriefcaseIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-muted-foreground tracking-wide leading-none">Experience</p>
                            <p className="text-xs font-semibold text-foreground mt-1 truncate" title={opp.experienceMax ? `${opp.experienceMin || 0}-${opp.experienceMax}y` : 'Fresher'}>
                                {opp.experienceMax ? `${opp.experienceMin || 0}-${opp.experienceMax}y` : 'Fresher'}
                            </p>
                        </div>
                    </div>
                    <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex items-start gap-2.5 min-h-[64px] min-w-0">
                        <UsersIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-muted-foreground tracking-wide leading-none">Employment</p>
                            <p className="text-xs font-semibold text-foreground mt-1 truncate" title={formatEmploymentText(opp.employmentType)}>
                                {formatEmploymentText(opp.employmentType)}
                            </p>
                        </div>
                    </div>
                    <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex items-start gap-2.5 min-h-[64px] min-w-0">
                        <ShieldCheckIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-muted-foreground tracking-wide leading-none">Role title</p>
                            <p className="text-xs font-semibold text-foreground mt-0.5 line-clamp-2 leading-tight" title={opp.jobFunction || 'General'}>
                                {opp.jobFunction || 'General'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex items-start gap-2.5 min-h-[64px] min-w-0">
                        <CurrencyRupeeIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-muted-foreground tracking-wide leading-none">Salary</p>
                            <p className="text-xs font-semibold text-foreground mt-1 truncate" title={_displaySalary || 'Competitive'}>
                                {_displaySalary || 'Competitive'}
                            </p>
                        </div>
                    </div>
                    {opp.postedAt && (() => {
                        const label = getPostedLabel(opp.postedAt);
                        return label ? (
                            <div className="bg-muted/10 border border-border/40 rounded-xl p-3 flex items-start gap-2.5 min-h-[64px] min-w-0">
                                <CalendarIcon className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-muted-foreground tracking-wide leading-none">Posted</p>
                                    <p className="text-xs font-semibold text-foreground mt-1 line-clamp-2 leading-tight">{label}</p>
                                </div>
                            </div>
                        ) : null;
                    })()}
                    {opp.expiresAt && (() => {
                        const exp = isExpired(opp);
                        const cs = isClosingSoon(opp);
                        const deadline = formatDeadline(opp);
                        return (
                            <div className={cn(
                                'border rounded-xl p-3 flex items-start gap-2.5 min-h-[64px] min-w-0',
                                exp ? 'bg-rose-500/5 border-rose-500/20' : cs ? 'bg-orange-500/5 border-orange-500/20' : 'bg-muted/10 border-border/40'
                            )}>
                                <ClockIcon className={cn('w-5 h-5 shrink-0 mt-0.5', exp ? 'text-rose-600' : cs ? 'text-orange-600' : 'text-primary')} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-muted-foreground tracking-wide leading-none">Deadline</p>
                                    <p className={cn('text-xs font-semibold mt-1 line-clamp-2 leading-tight',
                                        exp ? 'text-rose-600' : cs ? 'text-orange-600' : 'text-foreground'
                                    )}>
                                        {exp ? `Closed (${deadline})` : deadline || 'Not set'}
                                    </p>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}
