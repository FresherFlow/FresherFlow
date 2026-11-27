import Link from 'next/link';
import { slugify } from '@fresherflow/utils/slugify';
import { getCompanySlug } from '@/features/jobs/domain/opportunityDisplay';

interface RelatedSearchesProps {
    company?: string | null;
    companyHref?: string | null;
    companyWebsite?: string | null;
    passoutYears?: number[] | null;
    locations?: string[] | null;
    skills?: string[] | null;
    jobFunction?: string | null;
    validSkills?: string[] | Set<string>;
    validLocations?: string[] | Set<string>;
}

const titleCase = (value: string) =>
    value.trim().split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

const asSet = (value?: string[] | Set<string>) =>
    value ? (value instanceof Set ? value : new Set(value)) : null;

/**
 * The "Related searches" chip grid used on job detail pages. One definition,
 * used by the live detail and the closed-listing view, so the category links
 * (company, batch, location, skill, role) never drift between them.
 */
export function RelatedSearches({
    company,
    companyHref,
    companyWebsite,
    passoutYears,
    locations,
    skills,
    jobFunction,
    validSkills,
    validLocations,
}: RelatedSearchesProps) {
    const validSkillSet = asSet(validSkills);
    const validLocationSet = asSet(validLocations);
    const links: { label: string; href: string }[] = [];

    if (company) {
        links.push({
            label: `${company} careers`,
            href: companyHref || `/companies/${getCompanySlug(companyWebsite ?? null, company)}`,
        });
    }

    passoutYears?.forEach((year) => links.push({ label: `${year} batch jobs`, href: `/jobs/${year}-batch` }));

    (locations || [])
        .filter((loc) => !['india', 'pan india'].includes(loc.toLowerCase().trim()))
        .filter((loc) => !validLocationSet || validLocationSet.has(loc.trim().toLowerCase()) || validLocationSet.has(slugify(loc)))
        .forEach((loc) => links.push({ label: `Jobs in ${titleCase(loc)}`, href: `/jobs/${slugify(loc)}-jobs` }));

    (skills || [])
        .filter((skill) => !validSkillSet || validSkillSet.has(skill.trim().toLowerCase()) || validSkillSet.has(slugify(skill)))
        .slice(0, 5)
        .forEach((skill) => links.push({ label: `${titleCase(skill)} jobs`, href: `/jobs/${slugify(skill)}-jobs` }));

    if (jobFunction) {
        if (jobFunction.toLowerCase() === 'internship') {
            links.push({ label: 'Internships', href: '/jobs/internships' });
        } else {
            links.push({ label: `${titleCase(jobFunction)} jobs`, href: `/jobs/${slugify(jobFunction)}-jobs` });
        }
    }

    if (links.length === 0) return null;

    return (
        <div className="mt-4 rounded-xl border border-border bg-card p-4 dark:border-transparent">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                Related searches
            </h3>
            <div className="mt-2.5 flex flex-wrap gap-2">
                {links.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="inline-flex rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors dark:border-transparent dark:bg-muted [@media(hover:hover)_and_(pointer:fine)]:hover:border-primary/40 [@media(hover:hover)_and_(pointer:fine)]:hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        {link.label}
                    </Link>
                ))}
            </div>
        </div>
    );
}
