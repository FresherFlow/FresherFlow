import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '@/ui/Button';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { logRouteResult } from '@/lib/observability';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { fetchFeedIndex, fetchGovernmentFeed, fetchExpiredFeed } from '@/lib/api/feedServer';
import { getNextWalkinDate, getWalkinDates } from '@/features/jobs/utils/walkinEventUtils';
import { getDriveDetails, isWalkinOpportunity } from '@/features/jobs/utils/walkinMapUtils';
import type { Opportunity } from '@fresherflow/types';
import { getOpportunityPath } from '@/features/jobs/domain/opportunityPath';
import { generateOpportunityMetadata, generateOpportunityJsonLd, fetchOpportunityForPage } from '@/features/jobs/domain/opportunitySeo';
import OpportunityDetailClient from '@/features/jobs/components/detail/OpportunityDetailClient';
import { OpportunityDetailSkeleton } from '@/features/jobs/components/OpportunitySkeletons';

// No timer, by design — see `lib/api/feedCache.ts` for the full policy.
// Freshness arrives when the API says so: a rebuild calls /api/revalidate,
// which marks the feed tags stale, and the next request regenerates this
// page once. A number here would make every visitor and crawler pay for a
// full render.
export const revalidate = false;
// Newly published drives must resolve on their first visit. Unknown segments
// are still rejected by the explicit city/slug resolution below, so opening
// this to dynamic params does not let bots mint arbitrary city pages.
export const dynamicParams = true;

export async function generateStaticParams() {
    try {
        const [feed, govtFeed, expiredFeed] = await Promise.all([
            fetchFeedIndex(),
            fetchGovernmentFeed(),
            fetchExpiredFeed()
        ]);

        const segments = new Set<string>();
        const addDrive = (opp: Opportunity) => {
            if (!isWalkinOpportunity(opp)) return;
            if (opp.slug || opp.id) segments.add(String(opp.slug || opp.id));
            for (const loc of opp.locations ?? []) {
                const city = citySlugOf(loc);
                if (city && city !== 'pan-india' && city !== 'remote' && city !== 'worldwide') {
                    segments.add(city);
                }
            }
        };

        for (const opp of feed?.opportunities ?? []) addDrive(opp as Opportunity);
        for (const opp of govtFeed?.opportunities ?? []) addDrive(opp as Opportunity);
        for (const opp of expiredFeed?.opportunities ?? []) addDrive(opp as Opportunity);

        return Array.from(segments).map((segment) => ({ segment }));
    } catch {
        return [];
    }
}

const formatLabel = (value: string) =>
    value
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

function citySlugOf(loc: string): string {
    return loc.trim().toLowerCase().replace(/\s+/g, '-');
}

/** Returns true for errors thrown by notFound() or redirect()/permanentRedirect() in Next.js 15+/16. */
function isNextNavigationError(err: unknown): boolean {
    const digest = (err as { digest?: string })?.digest ?? '';
    return digest === 'NEXT_HTTP_ERROR_FALLBACK;404' || digest.startsWith('NEXT_REDIRECT');
}

/** Resolve a segment as a walk-in drive detail before treating it as a city. */
async function resolveDrive(segment: string): Promise<Opportunity | null> {
    try {
        const opp = await fetchOpportunityForPage(segment);
        if (!opp || !isWalkinOpportunity(opp)) return null;
        // A city slug must never win over an actual drive slug; generateStaticParams
        // asserts the two sets do not collide through the feed's slug contract.
        return opp;
    } catch (err) {
        if (isNextNavigationError(err)) throw err;
        return null;
    }
}

async function isKnownCity(segment: string): Promise<boolean> {
    try {
        const [feed, govtFeed, expiredFeed] = await Promise.all([
            fetchFeedIndex(),
            fetchGovernmentFeed(),
            fetchExpiredFeed(),
        ]);
        const feeds = [feed, govtFeed, expiredFeed];
        return feeds.some((f) => f?.opportunities?.some((opp) =>
            isWalkinOpportunity(opp as Opportunity) &&
            (opp.locations ?? []).some((loc) => citySlugOf(loc) === segment)
        ));
    } catch {
        return false;
    }
}

function cityMetadata(segment: string): Metadata {
    const cityLabel = formatLabel(segment);
    const title = `${cityLabel} Walk-in Interviews for Freshers — This Week's Drives`;
    const description = `Walk-in interviews and hiring drives in ${cityLabel} for freshers — dates, venues and eligibility where the employer shared them.`;
    const keywords = `${cityLabel} walk in interviews, ${cityLabel} walk in jobs, ${cityLabel} fresher jobs, ${cityLabel} hiring, ${cityLabel} off campus drives, this week walk in ${cityLabel}`;

    return {
        title,
        description,
        keywords,
        alternates: {
            canonical: `${SITE_URL}/drives/walk-in/${segment}`,
        },
        openGraph: {
            title,
            description,
            type: 'website',
            images: [
                {
                    url: '/main.png',
                    width: 1200,
                    height: 630,
                    alt: `Walk-ins in ${cityLabel} on FresherFlow`,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: ['/main.png'],
        },
    };
}

export async function generateMetadata({ params }: { params: Promise<{ segment: string }> }): Promise<Metadata> {
    const { segment } = await params;
    const drive = await resolveDrive(segment);
    if (drive) return generateOpportunityMetadata(drive);
    if (!(await isKnownCity(segment))) {
        notFound();
    }
    return cityMetadata(segment);
}

export default async function WalkInSegmentPage({ params }: { params: Promise<{ segment: string }> }) {
    const { segment } = await params;
    const drive = await resolveDrive(segment);

    if (drive) {
        // Resolve ID URLs to the permanent slug URL in one hop.
        if (segment === drive.id && drive.slug) {
            permanentRedirect(getOpportunityPath('WALKIN', drive.slug));
        }
        logRouteResult('/drives/walk-in/[segment] (drive)', '200');
        return (
            <>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(generateOpportunityJsonLd(drive)) }}
                />
                <Suspense fallback={<OpportunityDetailSkeleton />}>
                    <OpportunityDetailClient id={drive.id} initialData={drive} variant="drive" />
                </Suspense>
            </>
        );
    }

    const city = segment;
    try {
        if (!(await isKnownCity(city))) {
            logRouteResult('/drives/walk-in/[segment]', '404');
            notFound();
        }
    } catch (err) {
        if (isNextNavigationError(err)) throw err;
        // CDN is temporarily down — fall through and render optimistically.
    }

    logRouteResult('/drives/walk-in/[segment] (city)', '200');

    const feed = await fetchFeedIndex();
    const cityLabel = formatLabel(city);
    const cityDrives = ((feed?.opportunities ?? []) as Opportunity[])
        .filter(opp =>
            isWalkinOpportunity(opp) &&
            opp.locations?.some(loc => citySlugOf(loc) === city)
        )
        .sort((a, b) => {
            const da = getNextWalkinDate(a)?.getTime() ?? Infinity;
            const dbv = getNextWalkinDate(b)?.getTime() ?? Infinity;
            return da - dbv;
        });

    const upcoming = cityDrives.filter(opp => getNextWalkinDate(opp) !== null);
    const nextThree = upcoming.slice(0, 3);
    const pageUrl = `${SITE_URL}/drives/walk-in/${city}`;
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `Walk-ins in ${cityLabel}`,
        description: `Verified walk-in drives and fresher opportunities in ${cityLabel}.`,
        url: pageUrl,
        about: cityLabel,
    };
    const formatDay = (d: Date) =>
        d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    const driveHref = (opp: Opportunity) => getOpportunityPath('WALKIN', opp.slug || opp.id);

    return (
        <main className="min-h-screen bg-background px-3 md:px-6 py-10 md:py-14">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Walk-in drives</p>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                        Walk-in interviews in {cityLabel} for freshers.
                    </h1>
                    <p className="text-sm text-muted-foreground max-w-2xl">
                        {cityDrives.length === 0
                            ? `No walk-in drives listed in ${cityLabel} right now.`
                            : `${cityDrives.length} walk-in drive${cityDrives.length === 1 ? '' : 's'} listed in ${cityLabel}. Open a drive for the details the employer shared.`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="default" size="sm" asChild>
                            <Link href="/drives/walk-in">Browse all walk-ins</Link>
                        </Button>
                    </div>
                </div>

                {nextThree.length > 0 && (
                    <section aria-label="Next drives" className="space-y-2">
                        <h2 className="text-sm font-bold text-foreground">Coming up next</h2>
                        <div className="grid gap-2 sm:grid-cols-3">
                            {nextThree.map((opp) => {
                                const next = getNextWalkinDate(opp);
                                return (
                                    <Link
                                        key={opp.id}
                                        href={driveHref(opp)}
                                        className="rounded-xl border border-border bg-card p-3 space-y-1.5 hover:border-primary/40 hover:shadow-sm transition-all group"
                                    >
                                        <CompanyLogo
                                            companyName={opp.company}
                                            companyWebsite={opp.companyWebsite}
                                            companyLogoUrl={opp.companyLogoUrl}
                                            applyLink={opp.applyLink}
                                            className="!w-8 !h-8"
                                        />
                                        <p className="text-xs font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                                            {opp.normalizedRole || opp.title}
                                        </p>
                                        <p className="text-xs font-semibold text-muted-foreground truncate">{opp.company}</p>
                                        {next && (
                                            <p className="text-xs font-bold text-primary">{formatDay(next)}</p>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                )}

                {cityDrives.length > 0 ? (
                    <section aria-label={`All walk-ins in ${cityLabel}`} className="space-y-2">
                        <h2 className="text-sm font-bold text-foreground">
                            All drives in {cityLabel} <span className="font-medium text-muted-foreground">({cityDrives.length})</span>
                        </h2>
                        <div className="divide-y divide-border/60 rounded-xl border border-border bg-card overflow-hidden">
                            {cityDrives.map((opp) => {
                                const next = getNextWalkinDate(opp);
                                const dates = getWalkinDates(opp);
                                const d = getDriveDetails(opp);
                                return (
                                    <Link
                                        key={opp.id}
                                        href={driveHref(opp)}
                                        className="flex items-center gap-3 p-3.5 hover:bg-muted/40 transition-colors group"
                                    >
                                        <CompanyLogo
                                            companyName={opp.company}
                                            companyWebsite={opp.companyWebsite}
                                            companyLogoUrl={opp.companyLogoUrl}
                                            applyLink={opp.applyLink}
                                            className="!w-9 !h-9 shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                                {opp.normalizedRole || opp.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {opp.company}
                                                {d?.venueAddress ? ` · ${d.landmark || d.venueAddress}` : ''}
                                                {d?.reportingTime ? ` · report ${d.reportingTime}` : ''}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            {next ? (
                                                <p className="text-xs font-bold text-primary whitespace-nowrap">{formatDay(next)}</p>
                                            ) : (
                                                <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">Dates not shared</p>
                                            )}
                                            {dates.length > 1 && (
                                                <p className="text-xs text-muted-foreground whitespace-nowrap">{dates.length} days</p>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                ) : (
                    <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                        No walk-in drives listed in {cityLabel} right now.{' '}
                        <Link href="/drives/walk-in" className="font-semibold text-primary hover:underline">
                            Browse all cities ·
                        </Link>
                    </div>
                )}

            </div>
        </main>
    );
}
