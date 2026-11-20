import { Opportunity } from '@fresherflow/types';
import { cn } from '@/ui/cn';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { getCompanySlug } from '@/features/jobs/domain/opportunityDisplay';
import { SkillPill } from '@/features/jobs/components/SkillPill';
import Link from 'next/link';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import CurrencyRupeeIcon from '@heroicons/react/24/outline/CurrencyRupeeIcon';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import UsersIcon from '@heroicons/react/24/outline/UsersIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';

import { DriveMetadata } from '@/features/jobs/domain/driveTimeline';
import { getPrimaryEmploymentType, isInternshipOpportunity, isWalkinOpportunity } from '@/features/jobs/utils/walkinMapUtils';

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
    educationDetails: { level: string; courses: string | null; specializations: string | null };
}

/**
 * The masthead of a listing, rebuilt as an opportunity brief:
 * a single bold display title, a company identity row, a hairline
 * specification strip, and a two-column "Key Skills / Eligibility" band.
 * One memorable moment (the title), everything else quiet and aligned.
 */
export function DetailHeroSection({
    opp,
    isCampusDrive,
    listingState,
    driveDateItems,
    driveMeta,
    displaySalary,
    locationInfo,
    formatDeadline,
    educationDetails,
}: DetailHeroSectionProps) {
    const isGovernmentJob = Boolean(opp.governmentJobDetails);
    const govDetails = opp.governmentJobDetails;
    const applicationStart = govDetails?.applicationStartDate;
    const applicationEnd = govDetails?.applicationEndDate;

    const typeLabel = isCampusDrive
        ? 'Hiring Drive'
        : isInternshipOpportunity(opp)
            ? 'Internship'
            : isWalkinOpportunity(opp)
                ? 'Walk-in'
                : 'Job';

    const statusClass = listingState === 'EXPIRED'
        ? 'border-destructive/25 bg-destructive/5 text-destructive'
        : listingState === 'CLOSING_SOON'
            ? 'border-warning/25 bg-warning/10 text-warning'
            : listingState === 'ACTIVE'
                ? 'border-success/25 bg-success/10 text-success'
                : 'border-border bg-surface-sunken text-muted-foreground';
    const statusDot = listingState === 'EXPIRED'
        ? 'bg-destructive'
        : listingState === 'CLOSING_SOON'
            ? 'bg-warning'
            : listingState === 'ACTIVE'
                ? 'bg-success'
                : 'bg-muted-foreground/70';
    const statusLabel = listingState === 'EXPIRED'
        ? 'Expired'
        : listingState === 'CLOSING_SOON'
            ? 'Closing soon'
            : listingState === 'ACTIVE'
                ? 'Active'
                : listingState.charAt(0).toUpperCase() + listingState.slice(1).toLowerCase();

    const postedLabel = opp.postedAt
        ? new Date(opp.postedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';

    const batch = (opp.allowedPassoutYears || [])
        .slice()
        .sort((a, b) => Number(a) - Number(b))
        .join(', ');

    const facts: { label: string; value: string; icon: React.ReactNode }[] = [
        { label: 'Job type', value: formatEmploymentText(getPrimaryEmploymentType(opp)), icon: <UsersIcon className="size-3.5" /> },
        { label: 'Location', value: locationInfo.shortLabel, icon: <MapPinIcon className="size-3.5" /> },
        { label: 'Experience', value: opp.experienceMax ? `${opp.experienceMin || 0}–${opp.experienceMax} yrs` : 'Freshers', icon: <BriefcaseIcon className="size-3.5" /> },
        { label: 'Work type', value: opp.jobFunction || 'General', icon: <BriefcaseIcon className="size-3.5" /> },
        { label: 'Salary', value: displaySalary || 'Not specified', icon: <CurrencyRupeeIcon className="size-3.5" /> },
        { label: 'Batch', value: batch || 'Not specified', icon: <AcademicCapIcon className="size-3.5" /> },
    ];

    const education = educationDetails || { level: '', courses: null, specializations: null };
    const educationRows = [
        { label: 'Level', value: education.level },
        { label: 'Courses', value: education.courses },
        { label: 'Specializations', value: education.specializations },
        { label: 'Apply by', value: formatDeadline(opp) },
    ].filter((row): row is { label: string; value: string } => Boolean(row.value));

    const skills = opp.requiredSkills || [];

    return (
        <article className="relative overflow-hidden rounded-2xl border border-border-strong bg-card dark:border-transparent">
            {/* A single structural stroke anchors the masthead — an ink line,
                not a tinted surface. */}
            <div className="h-1 w-full bg-primary dark:bg-border-strong" />

            <div className="p-5 md:p-7">
                {/* Eyebrow: role family + status. Sentence case, no filler labels. */}
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <div className="flex items-center gap-2.5">
                        <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                        <span className="text-meta font-medium text-muted-foreground">{typeLabel}</span>
                        {opp.governmentJobDetails && (
                            <span className="rounded-md border border-warning/25 bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
                                Government
                            </span>
                        )}
                    </div>
                    <span className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                        statusClass
                    )}>
                        <span className={cn('size-1.5 shrink-0 rounded-full', statusDot)} aria-hidden="true" />
                        {statusLabel}
                    </span>
                </div>

                {/* The one bold moment. */}
                <h1 className={cn(
                    'mt-4 max-w-3xl font-bold leading-tight tracking-tight text-foreground text-balance',
                    'text-2xl md:text-3xl'
                )}>
                    {opp.title}
                </h1>

                {/* Company identity + posting date. */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <CompanyLogo
                            companyName={opp.company}
                            companyWebsite={opp.companyWebsite}
                            companyLogoUrl={opp.companyLogoUrl}
                            applyLink={opp.applyLink}
                            isGovernment={isGovernmentJob}
                            priority
                            className="size-12 shrink-0 rounded-xl"
                        />
                        <div className="min-w-0">
                            <Link
                                href={`/companies/${(opp as any).companySlug || getCompanySlug((opp as any).companyWebsite, opp.company)}`}
                                className="text-base font-semibold text-foreground transition-colors duration-150 ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:text-primary"
                            >
                                {opp.company}
                            </Link>
                            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPinIcon className="size-3.5 shrink-0" />
                                <span className="truncate" title={locationInfo.fullLabel}>
                                    {locationInfo.cities && locationInfo.cities.length > 1
                                        ? locationInfo.cities.join(', ')
                                        : locationInfo.shortLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-meta text-muted-foreground">
                        <ClockIcon className="size-3.5" />
                        <span>Posted {postedLabel}</span>
                    </div>
                </div>

                {/* Government stats — same spec-strip language as the facts. */}
                {isGovernmentJob && (
                    <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border-strong bg-border-strong dark:border-border dark:bg-border">
                        <div className="bg-card px-4 py-3">
                            <dt className="text-xs text-muted-foreground">Vacancies</dt>
                            <dd className="mt-1 text-xl font-bold tabular-nums text-foreground">{govDetails?.vacancyCount ?? 'NA'}</dd>
                        </div>
                        <div className="bg-card px-4 py-3">
                            <dt className="text-xs text-muted-foreground">Opens</dt>
                            <dd className="mt-1 text-sm font-semibold text-foreground">{applicationStart || '—'}</dd>
                        </div>
                        <div className="bg-card px-4 py-3">
                            <dt className="text-xs text-muted-foreground">Last date</dt>
                            <dd className="mt-1 text-sm font-semibold text-destructive">{applicationEnd || formatDeadline(opp) || '—'}</dd>
                        </div>
                    </dl>
                )}

                {/* Drive context pills. */}
                {driveDateItems.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                        {driveDateItems.map((item) => (
                            <span key={item.label} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-surface-sunken px-2.5 py-1 text-xs font-medium text-foreground">
                                <ClockIcon className="size-3.5 text-primary" />
                                {item.label}: {item.date?.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                        ))}
                    </div>
                )}
                {isCampusDrive && driveMeta.badges.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {driveMeta.badges.map((badge: string) => (
                            <span key={badge} className="rounded-lg border border-border bg-surface-sunken px-2.5 py-1 text-xs font-medium text-foreground">
                                {badge}
                            </span>
                        ))}
                    </div>
                )}

                {/* Specification strip: equal cells, hairline rules, large values. */}
                <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border-strong bg-border-strong dark:border-border dark:bg-border sm:grid-cols-3">
                    {facts.map((fact) => (
                        <div key={fact.label} className="bg-card px-4 py-3.5">
                            <dt className="flex items-center gap-1.5 text-meta text-muted-foreground">
                                <span className="text-primary" aria-hidden="true">{fact.icon}</span>
                                {fact.label}
                            </dt>
                            <dd className="mt-1.5 text-sm font-semibold leading-snug text-foreground tabular-nums">
                                {fact.value}
                            </dd>
                        </div>
                    ))}
                </dl>

                {/* Two-column band: what the role looks for, and who can apply. */}
                <div className="mt-6 grid gap-6 border-t border-border pt-6 md:grid-cols-2 md:gap-8">
                    <section aria-labelledby="hero-skills-heading">
                        <h2 id="hero-skills-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                            Key Skills
                        </h2>
                        {skills.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {skills.map((skill) => (
                                    <SkillPill key={skill} skill={skill} size="sm" className="text-meta! font-medium text-foreground dark:border-transparent dark:bg-surface-sunken" />
                                ))}
                            </div>
                        ) : (
                            <p className="mt-3 text-sm text-muted-foreground">No specific skills listed.</p>
                        )}
                    </section>

                    {educationRows.length > 0 && (
                        <section aria-labelledby="hero-eligibility-heading">
                            <h2 id="hero-eligibility-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                                Eligibility
                            </h2>
                            <dl className="mt-2 divide-y divide-border">
                                {educationRows.map((row) => (
                                    <div key={row.label} className="flex gap-4 py-2 text-sm">
                                        <dt className="w-24 shrink-0 text-muted-foreground">{row.label}</dt>
                                        <dd className="font-medium text-foreground">{row.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    )}
                </div>
            </div>
        </article>
    );
}
