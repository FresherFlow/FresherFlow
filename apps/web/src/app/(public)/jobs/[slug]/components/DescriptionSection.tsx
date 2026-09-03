import React from 'react';
import { sanitizeHtml } from '@repo/ui/utils/sanitize';

interface DescriptionSectionProps {
    description?: string | null;
    title?: string;
}

export const DescriptionSection = ({ description, title = 'Description' }: DescriptionSectionProps) => {
    return (
        <div className="space-y-3">
            <h3 className="text-base font-bold text-foreground tracking-tight">{title}</h3>
            <div
                className="max-w-none text-base leading-[1.75] text-foreground/85
                    [&_p]:my-3 [&_p]:text-base [&_p]:leading-[1.75]
                    [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5
                    [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5
                    [&_li]:text-base [&_li]:leading-relaxed
                    [&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:text-base [&_h4]:font-bold [&_h4]:text-foreground
                    [&_strong]:font-semibold [&_strong]:text-foreground
                    [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-primary/30 [&_a]:hover:decoration-primary/60"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
            />
        </div>
    );
};
