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
                className="prose prose-base max-w-none text-sm md:text-base leading-8 text-foreground/90 prose-p:my-2 prose-p:text-foreground/90 prose-p:font-medium prose-ul:my-3 prose-ul:list-disc prose-ul:pl-6 prose-ul:text-foreground/90 prose-li:my-1 prose-li:pl-1 prose-li:font-medium prose-li:marker:text-foreground/55 prose-h4:mt-5 prose-h4:mb-2 prose-h4:text-base prose-h4:font-semibold prose-h4:tracking-normal prose-h4:text-foreground"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
            />
        </div>
    );
};
