import React from 'react';
import { sanitizeHtml } from '@repo/ui/utils/sanitize';

interface DescriptionSectionProps {
    description?: string | null;
    title?: string;
}

export const DescriptionSection = ({ description, title = 'Description' }: DescriptionSectionProps) => {
    return (
        <div className="space-y-3 py-2">
            <h3 className="text-base font-bold text-foreground tracking-tight">{title}</h3>
            <div
                className="max-w-none text-sm leading-relaxed text-foreground/90 [&_p]:my-3 [&_p]:text-foreground/90 [&_p]:font-normal [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-foreground/90 [&_li]:my-1.5 [&_li]:pl-1 [&_li]:font-normal [&_li]:marker:text-foreground/30 [&_h4]:mt-6 [&_h4]:mb-2.5 [&_h4]:text-sm [&_h4]:font-bold [&_h4]:tracking-tight [&_h4]:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
            />
        </div>
    );
};
