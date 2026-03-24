import React from 'react';
import { sanitizeHtml } from '@/shared/ui/sanitize';

interface DescriptionSectionProps {
    description: string;
}

export const DescriptionSection = ({ description }: DescriptionSectionProps) => {
    return (
        <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-3">
            <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-muted-foreground pb-2">Description</h3>
            <div
                className="max-w-none text-sm md:text-base leading-8 text-foreground/90 [&_p]:my-2 [&_p]:text-foreground/90 [&_p]:font-medium [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-foreground/90 [&_li]:my-1 [&_li]:pl-1 [&_li]:font-medium [&_li]:marker:text-foreground/55 [&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:text-base [&_h4]:font-extrabold [&_h4]:tracking-tight [&_h4]:text-foreground [&_strong]:font-extrabold [&_strong]:text-foreground"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
            />
        </div>
    );
};
