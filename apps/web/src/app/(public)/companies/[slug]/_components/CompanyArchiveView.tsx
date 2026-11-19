import Link from 'next/link';
import type { Opportunity } from '@fresherflow/types';
import { Briefcase, Clock, MapPin } from 'lucide-react';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { toSafeOutboundUrl } from '@/lib/utils/safeOutboundUrl';

type Props = {
    companyName: string;
    slug: string;
    archivedRoles: Opportunity[];
};

/**
 * The page a company keeps when it has no open roles.
 *
 * This exists so a crawled /companies/{slug} never dies. Returning 301 to
 * /companies looked harmless but Google follows the redirect, finds the
 * directory page instead of the company, and drops the company URL from the
 * index. A 200 with honest archived content keeps the URL, its canonical, its
 * internal links and its rankings, and it is a better answer for a visitor
 * than the company list.
 *
 * Deliberately no "apply" affordances: these roles are closed.
 */
export default function CompanyArchiveView({ companyName, slug, archivedRoles }: Props) {
    return (
        <div className="w-full max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8">
            <article className="relative overflow-hidden rounded-2xl border border-border-strong bg-card dark:border-transparent">
                <div className="h-1 w-full bg-primary dark:bg-border-strong" />
                <div className="p-5 md:p-7">
                    <div className="flex items-center gap-2.5">
                        <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                        <span className="text-meta font-medium text-muted-foreground">Company profile</span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <CompanyLogo
                                companyName={companyName}
                                className="size-14 shrink-0 rounded-xl md:size-16"
                                priority
                            />
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold leading-[1.15] tracking-tight text-foreground text-balance md:text-3xl">
                                    {companyName}
                                </h1>
                                <p className="mt-1 text-pretty text-sm text-muted-foreground">
                                    No open roles right now
                                </p>
                            </div>
                        </div>

                        <Link
                            href="/jobs"
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-primary bg-primary px-3 text-meta font-semibold text-primary-foreground ff-press motion-reduce:transform-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            Browse open roles
                        </Link>
                    </div>
                </div>
            </article>

            <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                        {archivedRoles.length} recently closed {archivedRoles.length === 1 ? 'role' : 'roles'}
                    </h2>

                    {archivedRoles.length > 0 ? (
                        <div className="mt-3 grid gap-3">
                            {archivedRoles.map((job) => {
                                const locs = Array.isArray(job.locations) ? job.locations.filter(Boolean) : [];
                                const posted = job.postedAt ? new Date(job.postedAt) : null;
                                const postedLabel = posted && !Number.isNaN(posted.getTime())
                                    ? posted.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                    : null;
                                const careersUrl = toSafeOutboundUrl(job.companyWebsite);
                                return (
                                    <div
                                        key={job.id || job.slug}
                                        className="rounded-xl border border-border-strong bg-card p-4 dark:border-transparent dark:bg-surface-sunken"
                                    >
                                        <p className="font-semibold text-foreground">{job.title}</p>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-meta text-muted-foreground">
                                            {locs.length > 0 && (
                                                <span className="inline-flex items-center gap-1.5">
                                                    <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                                                    {locs.slice(0, 2).join(', ')}
                                                </span>
                                            )}
                                            {postedLabel && (
                                                <span className="inline-flex items-center gap-1.5 tabular-nums">
                                                    <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                                                    Closed {postedLabel}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1.5">
                                                <Briefcase className="size-3.5 shrink-0" aria-hidden="true" />
                                                Applications closed
                                            </span>
                                        </div>
                                        {careersUrl && (
                                            <a
                                                href={careersUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-3 inline-flex rounded-md text-meta font-medium text-primary underline decoration-primary/30 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(hover:hover)_and_(pointer:fine)]:hover:decoration-primary/60"
                                            >
                                                {companyName} careers page
                                            </a>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="mt-3 text-pretty text-sm text-muted-foreground">
                            This company has no fresher, internship or off-campus openings posted at the moment.
                            Roles reappear here as soon as they are posted.
                        </p>
                    )}

                    <div className="mt-5">
                        <Link
                            href={`/jobs?company=${encodeURIComponent(slug)}`}
                            className="inline-flex h-9 items-center rounded-md border border-border-strong bg-card px-3 text-meta font-medium text-foreground ff-press motion-reduce:transform-none [@media(hover:hover)_and_(pointer:fine)]:hover:border-primary/40 [@media(hover:hover)_and_(pointer:fine)]:hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-transparent dark:bg-surface-sunken"
                        >
                            Browse all open roles
                        </Link>
                    </div>
                </div>

                <aside>
                    <div className="rounded-2xl border border-border-strong bg-card p-5 dark:border-transparent">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                            Looking for openings?
                        </h2>
                        <p className="mt-3 text-pretty text-sm text-muted-foreground">
                            {companyName} posts fresher, internship and off-campus drives here when they open.
                            Save the roles you like and we will flag new ones.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
