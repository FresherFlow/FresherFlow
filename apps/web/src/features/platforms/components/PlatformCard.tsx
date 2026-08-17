'use client';

import { cn } from '@/lib/utils/utils';
import { ExternalLink, Star } from 'lucide-react';
import CompanyLogo from '@/ui/CompanyLogo';
import type { InternshipPlatform } from '@/features/platforms/types';

const REGION_TAGS = new Set([
    'United States', 'Canada', 'Remote', 'Global', 'India', 'United Kingdom',
    'Europe', 'Australia', 'Asia-Pacific', 'Online',
]);

interface PlatformCardProps {
    platform: InternshipPlatform;
}

export function PlatformCard({ platform }: PlatformCardProps) {
    const majorTags = platform.tags.filter(t => !REGION_TAGS.has(t));
    const regionTags = platform.tags.filter(t => REGION_TAGS.has(t));

    return (
        <div
            className={cn(
                'group relative flex flex-col h-full bg-card border rounded-xl p-3.5 md:p-4',
                'hover:border-primary/40 hover:shadow-md transition-all duration-200',
                platform.isRecommended ? 'border-primary/30' : 'border-border/70'
            )}
        >
            {/* Header: logo + name + visit */}
            <div className="flex items-start gap-3">
                <CompanyLogo
                    companyName={platform.name}
                    applyLink={platform.url}
                    companyLogoUrl={platform.companyLogoUrl}
                    className="w-9 h-9 md:w-10 md:h-10 rounded-lg shrink-0"
                />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <a
                            href={platform.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 leading-snug"
                        >
                            {platform.name}
                        </a>
                        {platform.isRecommended && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide text-primary bg-primary/10 border border-primary/20 shrink-0">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                Recommended
                            </span>
                        )}
                    </div>
                    {platform.type && (
                        <div className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">
                            {platform.type}
                        </div>
                    )}
                </div>
                <a
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit ${platform.name}`}
                    className={cn(
                        'inline-flex items-center gap-1 px-3 h-7 rounded-lg text-[11px] font-semibold shrink-0',
                        'bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200',
                        'md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100'
                    )}
                >
                    Visit
                    <ExternalLink className="w-3 h-3" />
                </a>
            </div>

            {/* Description */}
            <p className="text-xs md:text-[13px] text-muted-foreground leading-relaxed mt-2.5 line-clamp-2">
                {platform.description}
            </p>

            {/* Tags */}
            {(majorTags.length > 0 || regionTags.length > 0) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    {majorTags.slice(0, 4).map(tag => (
                        <span
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary border border-primary/15"
                        >
                            {tag}
                        </span>
                    ))}
                    {regionTags.slice(0, 3).map(tag => (
                        <span
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium text-muted-foreground bg-muted/40 border border-border/50"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
