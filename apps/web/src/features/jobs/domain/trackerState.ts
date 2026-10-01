import type { Opportunity } from '@fresherflow/types';
import { ActionType } from '@fresherflow/types';
import { CANONICAL_TRACKER_ACTION_TYPES, TRACKER_ACTION_ALIAS_KEYS, normalizeTrackerActionType } from '@fresherflow/utils';

/**
 * Tracker values that mean the user is already somewhere in this listing's
 * pipeline. Kept as strings rather than `ActionType` members because a stored
 * item can still carry a legacy value the enum no longer offers — `PLANNING`,
 * `ATTENDED`, and the older `OFFERED` / `INTERVIEWING` / `SAVED_FOR_LATER`
 * spellings.
 *
 * Derived from the canonical stage list plus the shared alias keys, so the card
 * and the detail select can never disagree about what counts as a pipeline
 * stage and there is no second copy of the alias list to forget to update.
 */
export const PIPELINE_ACTION_TYPES: string[] = [
    ...CANONICAL_TRACKER_ACTION_TYPES.map((key) => key as string),
    ...TRACKER_ACTION_ALIAS_KEYS,
];

type JobWithActions = Opportunity & { actions?: Array<{ actionType: string }> };

/**
 * The pipeline stage carried on the payload, or `null` when it carries none.
 * Returned as a canonical `ActionType` key so every caller compares the same
 * value, whatever spelling the payload used.
 *
 * One home for the lookup: the job card, the shared card hook and the split-view
 * row all answer "is this row Applied?" from the same list, so the same listing
 * cannot show Applied in the list and nothing in the sidebar.
 */
export function getPipelineActionType(opp: Opportunity): ActionType | null {
    const found = (opp as JobWithActions).actions?.find?.((action) =>
        PIPELINE_ACTION_TYPES.includes(action.actionType)
    )?.actionType;
    if (found === undefined) return null;
    return normalizeTrackerActionType(found) as ActionType;
}

/**
 * Whether a compact row should mark the listing Applied.
 *
 * The payload wins when it carries a pipeline action. When it carries none, the
 * caller's `isApplied` prop is the fallback — a feed can know "applied" from its
 * own state before the actions array is hydrated.
 */
export function resolveShowApplied(opp: Opportunity, isAppliedFallback = false): boolean {
    const status = getPipelineActionType(opp);
    return status === ActionType.APPLIED || (!status && isAppliedFallback);
}
