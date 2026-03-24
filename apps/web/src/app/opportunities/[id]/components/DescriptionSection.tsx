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
                className="prose prose-base max-w-none text-foreground/80 font-medium text-sm md:text-base leading-relaxed prose-p:my-3 prose-ul:my-3 prose-li:my-1 prose-h4:mt-5 prose-h4:mb-2 prose-h4:text-sm prose-h4:font-bold prose-h4:uppercase prose-h4:tracking-[0.16em] prose-h4:text-foreground"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
            />
        </div>
    );
};
