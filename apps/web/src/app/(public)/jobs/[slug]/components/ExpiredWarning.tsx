import React from 'react';
import Link from 'next/link';
import { ClockIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

interface ExpiredWarningProps {
    opportunityId?: string;
    opportunityTitle?: string;
}

export const ExpiredWarning = ({ opportunityId, opportunityTitle }: ExpiredWarningProps) => {
    const params = new URLSearchParams({
        title: `Discussion: ${(opportunityTitle || 'Expired Opportunity').slice(0, 100)}`,
        body: `This opportunity has expired. Let's continue the discussion here.`,
        category: 'DISCUSSION',
    });
    if (opportunityId) params.set('sourceOpportunityId', opportunityId);

    return (
        <div className="space-y-3">
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 md:p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="p-2 bg-destructive/10 rounded-full">
                    <ClockIcon className="w-6 h-6 text-destructive" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-destructive uppercase tracking-wide">Opportunity Expired</h3>
                    <p className="text-sm md:text-base text-muted-foreground font-medium">
                        This listing is no longer accepting applications. It is visible for historical reference only.
                    </p>
                </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 md:p-4">
                <p className="text-sm text-muted-foreground mb-2">
                    Interested in discussing this opportunity with the community?
                </p>
                <Link
                    href={`/community?${params.toString()}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2.5 min-h-[44px] text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                    <ChatBubbleLeftIcon className="w-4 h-4" />
                    Continue Discussion
                </Link>
            </div>
        </div>
    );
};
