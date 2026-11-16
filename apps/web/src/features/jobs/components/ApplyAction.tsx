import { cn } from '@fresherflow/ui/utils/cn';
import { ArrowUpRight } from 'lucide-react';
import { AtsLogo } from '@/features/jobs/components/AtsLogo';
import { getApplyDestination } from '@/features/jobs/utils/atsProvider';

/**
 * Every Apply control in the feed, defined once.
 *
 * The job detail page has always told you *where* Apply sends you ("Apply on
 * Greenhouse", with that platform's mark). The list row and the split pane
 * each grew their own button that just said "Apply", so the same listing read
 * as going nowhere from one surface and to Greenhouse from another.
 *
 * `getApplyDestination` owns the wording and `AtsLogo` owns the mark; this
 * module owns how they are arranged, so a row, a pane and a detail page can
 * never disagree about which ATS you are about to land on.
 */

export type ApplyActionSize = 'row' | 'pane';

interface ApplyActionContentProps {
    applyLink?: string | null;
    isGovernment?: boolean;
    /**
     * `false` keeps the label to "Apply" for surfaces with no room (list rows).
     * The ATS mark still renders, and the destination is exposed through the
     * control's title/aria-label.
     */
    showDestination?: boolean;
    /** Arrow affordance: on where the control has room, off in a dense row. */
    showArrow?: boolean;
}

/** The mark + label pair. Wrapped by each surface in its own geometry. */
export function ApplyActionContent({
    applyLink,
    isGovernment,
    showDestination = false,
    showArrow = false,
}: ApplyActionContentProps) {
    const destination = getApplyDestination(applyLink, isGovernment);
    return (
        <>
            <span className="truncate leading-none">
                {showDestination ? destination.label : 'Apply'}
            </span>
            {/* The ATS mark sits AFTER the label, on the right edge of the
                button, in a fixed 16px box that can neither shrink nor stretch
                it. Only rendered when there really is a provider mark: an empty
                box would push the word "Apply" off centre. */}
            {destination.provider && (
                <span className="inline-flex size-4 shrink-0 items-center justify-center">
                    <AtsLogo applyLink={applyLink} className="size-4 rounded-sm" />
                </span>
            )}
            {showArrow && (
                <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
            )}
        </>
    );
}

export interface ApplyActionProps extends ApplyActionContentProps {
    applyLink?: string | null;
    size?: ApplyActionSize;
    /**
     * When present the control is a `<button>` that runs this (the detail
     * hooks apply analytics + history); otherwise it is a real `<a>` to the
     * apply link. Detail surfaces pass a handler, list rows do not.
     */
    onApply?: () => void;
    /** Row rows live inside a clickable row; this stops the click bubbling. */
    stopPropagation?: boolean;
    className?: string;
}

const SIZE_CLASSES: Record<ApplyActionSize, string> = {
    // 32px tall so it matches the bookmark control beside it, and sized by its
    // label ("Apply" or "Apply on Greenhouse") rather than a guessed fixed
    // width — a fixed box is what clipped it to "Ap…".
    row: 'h-8 cursor-pointer gap-2 rounded-md border border-border bg-card px-2.5 text-xs font-semibold text-foreground ff-press motion-reduce:transform-none [@media(hover:hover)_and_(pointer:fine)]:hover:border-primary [@media(hover:hover)_and_(pointer:fine)]:hover:bg-primary [@media(hover:hover)_and_(pointer:fine)]:hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    // 40px, matching the icon controls beside it and the detail page's action
    // row, so a pane header and a job page CTA are the same control height.
    pane: 'h-10 cursor-pointer gap-1.5 rounded-lg bg-primary px-3.5 text-meta font-semibold text-primary-foreground ff-press motion-reduce:transform-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-primary/90',
};

export function ApplyAction({
    applyLink,
    isGovernment,
    size = 'pane',
    showDestination = false,
    showArrow = size === 'pane',
    onApply,
    stopPropagation = false,
    className,
}: ApplyActionProps) {
    const destination = getApplyDestination(applyLink, isGovernment);
    const shared = cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        SIZE_CLASSES[size],
        className,
    );
    const content = (
        <ApplyActionContent
            applyLink={applyLink}
            isGovernment={isGovernment}
            showDestination={showDestination}
            showArrow={showArrow}
        />
    );
    const label = destination.label;

    if (onApply) {
        return (
            <button
                type="button"
                onClick={(e) => {
                    if (stopPropagation) e.stopPropagation();
                    onApply();
                }}
                title={label}
                aria-label={label}
                className={shared}
            >
                {content}
            </button>
        );
    }

    if (!applyLink) return null;

    return (
        <a
            href={applyLink}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            aria-label={label}
            onClick={(e) => {
                if (stopPropagation) e.stopPropagation();
            }}
            className={shared}
        >
            {content}
        </a>
    );
}
