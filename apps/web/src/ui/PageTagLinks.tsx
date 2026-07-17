import Link from 'next/link';
import { slugify } from '@fresherflow/utils/slugify';

interface TagLink {
    label: string;
    url: string;
}

interface CompanyLink {
    name: string;
    logoUrl?: string | null;
    slug: string;
}

interface PageTagLinksProps {
    skills?: (string | TagLink)[];
    locations?: (string | TagLink)[];
    companies?: CompanyLink[];
    /** Max items shown per group. Default: 14 */
    maxItems?: number;
}

const TAG_CLASS = 'text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary border border-border transition-colors capitalize';
const LABEL_CLASS = 'text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 w-20';

function resolveTagLink(item: string | TagLink, prefix: string): TagLink {
    if (typeof item === 'string') {
        return { label: item, url: `/${prefix}/${slugify(item)}` };
    }
    return item;
}

export function PageTagLinks({ skills = [], locations = [], companies = [], maxItems = 14 }: PageTagLinksProps) {
    const hasAny = skills.length > 0 || locations.length > 0 || companies.length > 0;
    if (!hasAny) return null;

    return (
        <div className="border-t border-border/60 pt-6 space-y-3">
            {companies.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className={LABEL_CLASS}>Companies</span>
                    {companies.slice(0, maxItems).map((company) => (
                        <Link
                            key={company.slug}
                            href={`/companies/${company.slug}`}
                            className="flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary border border-border transition-colors"
                        >
                            {company.logoUrl && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={company.logoUrl}
                                    alt={company.name}
                                    className="w-3.5 h-3.5 rounded object-contain shrink-0"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            )}
                            {company.name}
                        </Link>
                    ))}
                </div>
            )}

            {skills.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className={LABEL_CLASS}>Skills</span>
                    {skills.slice(0, maxItems).map((item) => {
                        const { label, url } = resolveTagLink(item, 'skills');
                        return (
                            <Link key={url} href={url} className={TAG_CLASS}>
                                {label}
                            </Link>
                        );
                    })}
                </div>
            )}

            {locations.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className={LABEL_CLASS}>Locations</span>
                    {locations.slice(0, maxItems).map((item) => {
                        const { label, url } = resolveTagLink(item, 'location');
                        return (
                            <Link key={url} href={url} className={TAG_CLASS}>
                                {label}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
