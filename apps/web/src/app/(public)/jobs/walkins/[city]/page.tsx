import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/ui/Button';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { logRouteResult } from '@/lib/observability';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { fetchFeedIndex, fetchGovernmentFeed, fetchExpiredFeed } from '@/lib/api/cdnFeed';
import { getNextWalkinDate, getWalkinDates } from '@/features/jobs/utils/walkinEventUtils';
import type { Opportunity } from '@fresherflow/types';

export const revalidate = false; // on-demand only — busted via revalidateTag on publish
// dynamicParams = false blocks newly published jobs to be dynamically generated on their first visit,
// but prevents cache poisoning by bots.
export const dynamicParams = false;

export async function generateStaticParams() {
    try {
        const [feed, govtFeed, expiredFeed] = await Promise.all([
            fetchFeedIndex(false, undefined, true),
            fetchGovernmentFeed(false, undefined, true),
            fetchExpiredFeed(undefined, true)
        ]);

        const cities = new Set<string>();

        const addWalkInCities = (opportunities: any[]) => {
            if (!opportunities) return;
            for (const opp of opportunities) {
                if (opp.type !== 'WALKIN') continue;
                for (const loc of opp.locations ?? []) {
                    const city = loc.trim().toLowerCase().replace(/\s+/g, '-');
                    if (city && city !== 'pan-india' && city !== 'remote' && city !== 'worldwide') {
                        cities.add(city);
                    }
                }
            }
        };

        if (feed?.opportunities) addWalkInCities(feed.opportunities);
        if (govtFeed?.opportunities) addWalkInCities(govtFeed.opportunities);
        if (expiredFeed?.opportunities) addWalkInCities(expiredFeed.opportunities);

        return Array.from(cities).map((city) => ({ city }));
    } catch {
        return [];
    }
}

const formatLabel = (value: string) =>
    value
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
    const { city } = await params;
    const cityLabel = formatLabel(city);
    const title = `${cityLabel} Walk-in Interviews for Freshers — This Week's Drives`;
    const description = `Walk-in interviews and direct hiring drives in ${cityLabel} for freshers — dates, venues, reporting times and eligibility, verified by the community. Updated daily.`;
    const keywords = `${cityLabel} walk in interviews, ${cityLabel} walk in jobs, ${cityLabel} fresher jobs, ${cityLabel} hiring, ${cityLabel} off campus drives, this week walk in ${cityLabel}`;

    return {
        title,
        description,
        keywords,
        alternates: {
            canonical: `${SITE_URL}/jobs/walkins/${city}`,
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

/** Returns true for errors thrown by notFound() or redirect()/permanentRedirect() in Next.js 15+/16. */
function isNextNavigationError(err: unknown): boolean {
    const digest = (err as { digest?: string })?.digest ?? '';
    return digest === 'NEXT_HTTP_ERROR_FALLBACK;404' || digest.startsWith('NEXT_REDIRECT');
}

function citySlugOf(loc: string): string {
    return loc.trim().toLowerCase().replace(/\s+/g, '-');
}

export default async function WalkInsCityLandingPage({ params }: { params: Promise<{ city: string }> }) {
    const { city } = await params;

    try {
        // Validate city against feed to prevent cache poisoning by bots
        const feed = await fetchFeedIndex(false, undefined, true);
        const hasCity = feed?.opportunities?.some(opp =>
            opp.type === 'WALKIN' &&
            opp.locations?.some(loc => citySlugOf(loc) === city)
        );

        if (!hasCity) {
            logRouteResult('/jobs/walkins/[city]', '404');
            notFound();
        }
    } catch (err) {
        if (isNextNavigationError(err)) throw err;
        // CDN is temporarily down — fall through and render the page optimistically.
        // dynamicParams = false means this city was valid at build time.
    }

    logRouteResult('/jobs/walkins/[city]', '200');

    // Full drive list for this city (upcoming first, then by date)
    const feed = await fetchFeedIndex(false, undefined, true);
    const cityLabel = formatLabel(city);
    const cityDrives = ((feed?.opportunities ?? []) as Opportunity[])
        .filter(opp =>
            (opp.type === 'WALKIN' || Boolean(opp.walkInDetails)) &&
            opp.locations?.some(loc => citySlugOf(loc) === city)
        )
        .sort((a, b) => {
            const da = getNextWalkinDate(a)?.getTime() ?? Infinity;
            const dbv = getNextWalkinDate(b)?.getTime() ?? Infinity;
            return da - dbv;
        });

    const upcoming = cityDrives.filter(opp => getNextWalkinDate(opp) !== null);
    const upcomingCount = upcoming.length;

    // Next 3 drives for the header strip
    const nextThree = upcoming.slice(0, 3);

    const pageUrl = `${SITE_URL}/jobs/walkins/${city}`;
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
                        {upcomingCount > 0
                            ? `${upcomingCount} upcoming drive${upcomingCount === 1 ? '' : 's'} with dates, venues and reporting times — verified by the community.`
                            : `Dates and venues for walk-in drives in ${cityLabel}, verified by the community.`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="default" size="sm" asChild>
                            <Link href="/jobs/walkins">Browse all walk-ins</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/login">Get alerts for {cityLabel}</Link>
                        </Button>
                    </div>
                </div>

                {/* Next drives strip */}
                {nextThree.length > 0 && (
                    <section aria-label="Next drives" className="space-y-2">
                        <h2 className="text-sm font-bold text-foreground">Coming up next</h2>
                        <div className="grid gap-2 sm:grid-cols-3">
                            {nextThree.map((opp) => {
                                const next = getNextWalkinDate(opp);
                                return (
                                    <Link
                                        key={opp.id}
                                        href={`/jobs/${opp.slug}`}
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

                {/* Full drive list */}
                {cityDrives.length > 0 ? (
                    <section aria-label={`All walk-ins in ${cityLabel}`} className="space-y-2">
                        <h2 className="text-sm font-bold text-foreground">
                            All drives in {cityLabel} <span className="font-medium text-muted-foreground">({cityDrives.length})</span>
                        </h2>
                        <div className="divide-y divide-border/60 rounded-xl border border-border bg-card overflow-hidden">
                            {cityDrives.map((opp) => {
                                const next = getNextWalkinDate(opp);
                                const dates = getWalkinDates(opp);
                                const d = opp.walkInDetails;
                                return (
                                    <Link
                                        key={opp.id}
                                        href={`/jobs/${opp.slug}`}
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
                                                <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">Dates passed</p>
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
                        <Link href="/jobs/walkins" className="font-semibold text-primary hover:underline">
                            Browse all cities ·
                        </Link>
                    </div>
                )}

                {/* Community bridge — the trust layer for this city */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">Went to a drive in {cityLabel}?</p>
                        <p className="text-xs text-muted-foreground">Share how it went — real reports help others decide.</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/community/areas">Join the {cityLabel} community</Link>
                    </Button>
                </div>
            </div>
        </main>
    );
}
