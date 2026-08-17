import Link from 'next/link';
import { slugify } from '@fresherflow/utils/slugify';
import { Card } from '@/ui/Card';
import { Badge } from '@/ui/Badge';

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
    validSkills?: Set<string> | string[];
    validLocations?: Set<string> | string[];
    /** Max items shown per group. Default: 14 */
    maxItems?: number;
}

function resolveTagLink(item: string | TagLink, prefix: string): TagLink {
    if (typeof item === 'string') {
        return { label: item, url: `/${prefix}/${slugify(item)}` };
    }
    return item;
}

export function PageTagLinks({ skills = [], locations = [], companies = [], validSkills, validLocations, maxItems = 14 }: PageTagLinksProps) {
    const validSkillsSet = validSkills ? (validSkills instanceof Set ? validSkills : new Set(validSkills)) : null;
    const validLocationsSet = validLocations ? (validLocations instanceof Set ? validLocations : new Set(validLocations)) : null;

    const filteredSkills = validSkillsSet
        ? skills.filter(item => {
            const label = typeof item === 'string' ? item : item.label;
            return validSkillsSet.has(label.toLowerCase().trim()) || validSkillsSet.has(slugify(label));
        })
        : skills;

    const filteredLocations = validLocationsSet
        ? locations.filter(item => {
            const label = typeof item === 'string' ? item : item.label;
            return validLocationsSet.has(label.toLowerCase().trim()) || validLocationsSet.has(slugify(label));
        })
        : locations;

    const hasAny = filteredSkills.length > 0 || filteredLocations.length > 0 || companies.length > 0;
    if (!hasAny) return null;

    return (
        <Card className="p-4 md:p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Related Topics & Directories</h3>
            
            <div className="space-y-3">
                {companies.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground shrink-0 w-24">Companies:</span>
                        <div className="flex flex-wrap gap-1.5 flex-1">
                            {companies.slice(0, maxItems).map((company) => (
                                <Link key={company.slug} href={`/companies/${company.slug}`}>
                                    <Badge variant="outline" className="gap-1.5 hover:border-primary/40 hover:text-primary transition-colors cursor-pointer">
                                        {company.logoUrl && (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={company.logoUrl}
                                                alt={company.name}
                                                className="w-3.5 h-3.5 rounded object-contain shrink-0"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        )}
                                        <span>{company.name}</span>
                                    </Badge>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {filteredSkills.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground shrink-0 w-24">Key Skills:</span>
                        <div className="flex flex-wrap gap-1.5 flex-1">
                            {filteredSkills.slice(0, maxItems).map((item) => {
                                const { label, url } = resolveTagLink(item, 'skills');
                                return (
                                    <Link key={url} href={url}>
                                        <Badge variant="secondary" className="hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer capitalize">
                                            {label}
                                        </Badge>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {filteredLocations.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground shrink-0 w-24">Locations:</span>
                        <div className="flex flex-wrap gap-1.5 flex-1">
                            {filteredLocations.slice(0, maxItems).map((item) => {
                                const { label, url } = resolveTagLink(item, 'locations');
                                return (
                                    <Link key={url} href={url}>
                                        <Badge variant="outline" className="hover:border-primary/40 hover:text-primary transition-colors cursor-pointer capitalize">
                                            {label}
                                        </Badge>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
