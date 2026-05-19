import React from 'react';
import { sanitizeHtml } from '@/shared/ui/sanitize';

interface DescriptionSectionProps {
    description: string;
    title?: string;
}

export const DescriptionSection = ({ description, title = 'Description' }: DescriptionSectionProps) => {
    return (
        <div className="bg-card p-5 md:p-6 rounded-2xl border border-border shadow-sm space-y-4">
            <h3 className="text-sm md:text-base font-bold text-foreground/80 tracking-tight">{title}</h3>
            <div
                className="max-w-none text-[15px] md:text-base leading-relaxed text-foreground [&_p]:my-3 [&_p]:text-foreground [&_p]:font-normal [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-foreground [&_li]:my-1.5 [&_li]:pl-1 [&_li]:font-normal [&_li]:marker:text-foreground/40 [&_h4]:mt-6 [&_h4]:mb-2.5 [&_h4]:text-base [&_h4]:font-bold [&_h4]:tracking-tight [&_h4]:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
            />
        </div>
    );
};
