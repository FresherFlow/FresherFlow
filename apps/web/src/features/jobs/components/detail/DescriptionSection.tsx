import React from 'react';
import { sanitizeHtml } from '@repo/ui/utils/sanitize';
import { Skeleton } from '@/ui/Skeleton';

interface DescriptionSectionProps {
    description?: string | null;
    title?: string;
    /**
     * True while full detail (with description) is still being upgraded from
     * the CDN shard / same-origin proxy. Shows a small inline shimmer instead
     * of an empty section so the gap between heading and content reads as
     * "loading", not "no description".
     */
    isLoading?: boolean;
}

export const DescriptionSection = ({ description, title = 'Description', isLoading = false }: DescriptionSectionProps) => {
    const html = React.useMemo(() => sanitizeHtml(description), [description]);

    // Rendered content exists (either real HTML or the loading shimmer) —
    // otherwise the heading would sit alone and read as a broken section.
    if (!html && !isLoading) return null;

    return (
        <div className="space-y-3">
            <h3 className="text-base font-bold text-foreground tracking-tight">{title}</h3>
            {html ? (
                <div
                    className="max-w-none text-base leading-relaxed text-foreground/85 [&_p]:my-3 [&_p]:text-base [&_p]:leading-relaxed [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_li]:text-base [&_li]:leading-relaxed [&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:text-base [&_h4]:font-bold [&_h4]:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-primary/30 [&_a]:hover:decoration-primary/60"
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            ) : (
                <div className="space-y-2 py-1" aria-busy="true" aria-label="Loading description">
                    <Skeleton className="h-3 w-11/12" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                </div>
            )}
        </div>
    );
};
