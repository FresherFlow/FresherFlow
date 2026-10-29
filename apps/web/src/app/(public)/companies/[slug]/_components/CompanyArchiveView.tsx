import Link from 'next/link';
import type { Opportunity } from '@fresherflow/types';
import { Briefcase } from 'lucide-react';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { Card, CardContent } from '@/ui/Card';
import { BrandButton } from '@/ui/BrandButton';
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
            <header className="flex items-center gap-3 sm:gap-4">
                <CompanyLogo companyName={companyName} className="!h-14 !w-14 md:!h-20 md:!w-20 shrink-0" priority />
                <div className="min-w-0">
                    <h1 className="truncate text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                        {companyName}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        No open roles right now
                    </p>
                </div>
            </header>

            <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <h2 className="text-lg font-bold tracking-tight text-foreground">
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
                                return (
                                    <Card key={job.id || job.slug}>
                                        <CardContent className="p-4">
                                            <p className="font-semibold text-foreground">{job.title}</p>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                {locs.length > 0 && <span>{locs.slice(0, 2).join(', ')}</span>}
                                                {postedLabel && <span>Closed {postedLabel}</span>}
                                                <span className="inline-flex items-center gap-1">
                                                    <Briefcase className="size-3" aria-hidden="true" />
                                                    Applications closed
                                                </span>
                                            </div>
                                            {toSafeOutboundUrl(job.companyWebsite) && (
                                                <a
                                                    href={toSafeOutboundUrl(job.companyWebsite)!}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                                                >
                                                    {companyName} careers page
                                                </a>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="mt-3 text-sm text-muted-foreground">
                            This company has no fresher, internship or off-campus openings posted at the moment.
                            Roles reappear here as soon as they are posted.
                        </p>
                    )}

                    <div className="mt-5">
                        <BrandButton asChild variant="outline" size="sm">
                            <Link href={`/jobs?company=${encodeURIComponent(slug)}`}>
                                Browse all open roles
                            </Link>
                        </BrandButton>
                    </div>
                </div>

                <aside>
                    <Card>
                        <CardContent className="p-5">
                            <h2 className="text-lg font-bold tracking-tight text-foreground">
                                Looking for openings?
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {companyName} posts fresher, internship and off-campus drives here when they open.
                                Save the roles you like and we will flag new ones.
                            </p>
                        </CardContent>
                    </Card>
                </aside>
            </div>
        </div>
    );
}