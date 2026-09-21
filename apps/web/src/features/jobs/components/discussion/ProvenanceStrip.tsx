'use client';

import { formatDistanceToNow } from 'date-fns';

type Props = {
    postedByUsername?: string | null;
    postedAt?: string | Date | null;
    sourceLink?: string | null;
};

/**
 * Provenance strip (doc 24 D10): "Shared by @user - 2h ago - Source".
 * Renders from existing detail payload fields; hides entirely when absent.
 */
export function ProvenanceStrip({ postedByUsername, postedAt, sourceLink }: Props) {
    if (!postedByUsername && !postedAt && !sourceLink) return null;

    const when = postedAt
        ? formatDistanceToNow(new Date(postedAt), { addSuffix: true })
        : null;

    return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {postedByUsername && (
                <span className="font-semibold text-foreground">Shared by @{postedByUsername}</span>
            )}
            {when && <span aria-hidden="true">·</span>}
            {when && <span>{when}</span>}
            {sourceLink && (
                <>
                    <span aria-hidden="true">·</span>
                    <a
                        href={sourceLink}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="font-semibold text-primary hover:underline"
                    >
                        Source
                    </a>
                </>
            )}
        </div>
    );
}
