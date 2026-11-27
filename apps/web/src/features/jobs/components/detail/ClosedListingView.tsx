import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import type { Opportunity } from '@fresherflow/types';
import { Button } from '@/ui/Button';
import { RelatedSearches } from '@/features/jobs/components/detail/RelatedSearches';
import { formatSalaryBadge, getPrimaryEmploymentType } from '@/features/jobs/utils/walkinMapUtils';

/**
 * One card, one message: the listing is closed. When the CDN still has the
 * listing, its facts stay below as a quiet reference. No apply action and no
 * JobPosting markup are emitted here.
 */
export interface ClosedListingViewProps {
    opportunity?: Opportunity | null;
    companyHref?: string | null;
    /** Validated directory facets from the live feed, when available. */
    validSkills?: Set<string> | string[];
    validLocations?: Set<string> | string[];
}

function formatFact(value: unknown): string {
    if (value == null || value === '') return 'Not shared';
    if (Array.isArray(value)) return value.length ? value.join(', ') : 'Not shared';
    return String(value);
}

export function ClosedListingView({
    opportunity,
    companyHref,
    validSkills,
    validLocations,
}: ClosedListingViewProps) {
    const hasListing = Boolean(opportunity);
    const title = opportunity ? opportunity.normalizedRole || opportunity.title : null;
    const company = opportunity?.company;
    const city = opportunity?.locations?.[0];
    const salary = opportunity ? formatSalaryBadge(opportunity) || opportunity.salaryRange : null;
    const experience = opportunity?.experienceMax
        ? `${opportunity.experienceMin || 0}–${opportunity.experienceMax} yrs`
        : 'Not shared';
    const skills = (opportunity?.requiredSkills || []).slice(0, 12);

    const facts = opportunity ? [
        { label: 'Location', value: formatFact(opportunity.locations) },
        { label: 'Company', value: company || 'Not shared' },
        { label: 'Experience', value: experience },
        { label: 'Qualification', value: formatFact(opportunity.allowedCourses || opportunity.allowedDegrees) },
        { label: 'Batch', value: formatFact(opportunity.allowedPassoutYears) },
        { label: 'Job type', value: formatFact(getPrimaryEmploymentType(opportunity)) },
        { label: 'Salary', value: formatFact(salary) },
        { label: 'Domain', value: formatFact(opportunity.jobFunction) },
    ] : [];

    return (
        <div className="flex min-h-0 w-full flex-1 overflow-y-auto bg-background text-foreground">
            <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-10">
                <section className="rounded-2xl border border-border-strong bg-card p-6 dark:border-transparent md:p-8">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                            <span className="text-meta font-medium text-muted-foreground">Listing unavailable</span>
                        </div>
                        <span className="flex size-8 items-center justify-center rounded-md bg-surface-sunken text-muted-foreground">
                            <Clock className="size-4" aria-hidden="true" />
                        </span>
                    </div>

                    <h1 className="mt-4 text-balance text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                        {hasListing ? 'This role is no longer available' : "We couldn't find this listing"}
                    </h1>

                    {hasListing ? (
                        <div className="mt-2">
                            {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
                            {(company || city) && (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {[company, city].filter(Boolean).join(' · ')}
                                </p>
                            )}
                        </div>
                    ) : null}

                    <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
                        {hasListing
                            ? 'Applications are closed. The details below are kept for reference only.'
                            : 'It may have closed, or the link may be wrong. Browse current openings instead.'}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                        <Button asChild size="sm">
                            <Link href="/jobs">
                                Browse open jobs
                                <ArrowRight className="size-4" aria-hidden="true" />
                            </Link>
                        </Button>
                        <Link href="/drives/walk-in" className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline">
                            Browse walk-ins
                        </Link>
                    </div>

                    {hasListing && (
                        <div className="mt-6 border-t border-border pt-5">
                            <h2 className="text-sm font-bold text-foreground">Details at a glance</h2>
                            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                                {facts.map((fact) => (
                                    <div key={fact.label} className="border-b border-border pb-2">
                                        <dt className="text-xs font-semibold text-muted-foreground">{fact.label}</dt>
                                        <dd className="mt-0.5 text-sm text-foreground">{fact.value}</dd>
                                    </div>
                                ))}
                            </dl>

                            {skills.length > 0 && (
                                <div className="mt-5">
                                    <h3 className="text-xs font-bold text-foreground">Key skills</h3>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {skills.map((skill) => (
                                            <span key={skill} className="rounded-md bg-surface-sunken px-2 py-1 text-xs text-foreground">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {opportunity?.description && (
                                <div className="mt-5">
                                    <h3 className="text-xs font-bold text-foreground">About the role</h3>
                                    <p className="mt-2 whitespace-pre-line text-pretty text-sm leading-relaxed text-muted-foreground">
                                        {opportunity.description.replace(/<[^>]*>/g, ' ').slice(0, 1500)}
                                    </p>
                                </div>
                            )}

                        </div>
                    )}
                </section>

                <RelatedSearches
                    company={company}
                    companyHref={companyHref}
                    companyWebsite={opportunity?.companyWebsite}
                    passoutYears={opportunity?.allowedPassoutYears}
                    locations={opportunity?.locations ?? (validLocations ? Array.from(validLocations) : [])}
                    skills={opportunity?.requiredSkills ?? (validSkills ? Array.from(validSkills) : [])}
                    jobFunction={opportunity?.jobFunction}
                    validSkills={opportunity ? validSkills : undefined}
                    validLocations={opportunity ? validLocations : undefined}
                />
            </div>
        </div>
    );
}
