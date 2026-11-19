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

export type ApplyActionSize = 'row' | 'card' | 'pane';

/**
 * The compact boxed action used by job cards. Mirrors the detail page's
 * Related opportunities card exactly: h-8, a primary border *and* fill (the
 * border keeps the edge crisp in dark), and no third-party provider mark.
 * Kept here so a row, a saved card and a feed card cannot drift apart.
 */
export const APPLY_CARD_CLASS =
    'inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-primary bg-primary px-2.5 text-xs font-semibold text-primary-foreground ff-press motion-reduce:transform-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

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
    /**
     * Compact job cards drop the ATS mark so the action stays a neutral,
     * single-colour box like the detail page's Related opportunities card.
     * The destination still lives in the control's title/aria-label.
     */
    showProviderMark?: boolean;
}

/** The mark + label pair. Wrapped by each surface in its own geometry. */
export function ApplyActionContent({
    applyLink,
    isGovernment,
    showDestination = false,
    showArrow = false,
    showProviderMark = true,
}: ApplyActionContentProps) {
    const destination = getApplyDestination(applyLink, isGovernment);
    // The verb is never the part that truncates. The destination is derived
    // from the one wording helper; only the lead-in is split off so a narrow
    // row can drop "on Greenhouse" without ever showing "App…".
    const destinationName = destination.label.startsWith('Apply on ')
        ? destination.label.slice('Apply on '.length)
        : null;
    return (
        <>
            <span className="flex min-w-0 items-center gap-1 leading-snug">
                <span className="shrink-0">Apply</span>
                {showDestination && destinationName && (
                    <span className="truncate">on {destinationName}</span>
                )}
            </span>
            {/* The ATS mark sits AFTER the label, on the right edge of the
                button, in a fixed 16px box that can neither shrink nor stretch
                it. Only rendered when there really is a provider mark: an empty
                box would push the word "Apply" off centre. */}
            {showProviderMark && destination.provider && (
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
    // A row CTA is a button, not a filter chip: solid action fill, the same
    // height as the bookmark control beside it, and sized by its label rather
    // than a guessed fixed width. The shared hover-to-fill treatment used to
    // make it look like an outlined chip until the pointer touched it.
    row: 'h-9 cursor-pointer gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground ff-press motion-reduce:transform-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-primary/90',
    // Compact job cards: the boxed h-8 primary action from the detail page's
    // Related opportunities card. No provider mark — see APPLY_CARD_CLASS.
    card: APPLY_CARD_CLASS,
    // Primary weight, full width within the panel: a pane header and a job
    // page CTA are the same control, not two visual languages for one action.
    pane: 'h-10 w-full cursor-pointer gap-2 rounded-lg bg-primary px-4 text-meta font-semibold text-primary-foreground ff-press motion-reduce:transform-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-primary/90',
};

export function ApplyAction({
    applyLink,
    isGovernment,
    size = 'pane',
    showDestination = false,
    showArrow = size === 'pane',
    showProviderMark = true,
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
            showProviderMark={showProviderMark}
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
