import React from 'react';
import { sanitizeHtml } from '@/lib/sanitize';

interface DescriptionSectionProps {
    description: string;
}

export const DescriptionSection = ({ description }: DescriptionSectionProps) => {
    return (
        <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-3">
            <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-muted-foreground pb-2">Description</h3>
            <div
                className="prose prose-base max-w-none text-foreground/80 font-medium text-sm md:text-base leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
            />
        </div>
    );
};
