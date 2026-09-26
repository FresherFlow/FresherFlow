/**
 * Non-UI code for the Headline & Bio section: name handling, the save payload, and validation.
 *
 * The profile stores one `fullName` while the form collects first and last, so the split/join
 * belongs in one place rather than inline in a form.
 */

export interface HeadlineDraft {
    firstName: string;
    lastName: string;
    headline: string;
    about: string;
    avatarUrl: string;
}

export const EMPTY_HEADLINE_DRAFT: HeadlineDraft = {
    firstName: '',
    lastName: '',
    headline: '',
    about: '',
    avatarUrl: '',
};

export function splitFullName(fullName: string | null | undefined): { firstName: string; lastName: string } {
    const parts = (fullName ?? '').trim().split(' ').filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function combineFullName(firstName: string, lastName: string): string {
    return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export interface HeadlinePayload {
    fullName: string;
    headline: string | undefined;
    about: string | undefined;
    avatarUrl: string | null;
}

export function buildHeadlinePayload(draft: HeadlineDraft): HeadlinePayload {
    return {
        fullName: combineFullName(draft.firstName, draft.lastName),
        headline: draft.headline.trim() || undefined,
        about: draft.about.trim() || undefined,
        avatarUrl: draft.avatarUrl.trim() || null,
    };
}

/** Client cap, mirrored by the API's profileUpdateSchema — both reject longer. */
export const HEADLINE_MAX_LENGTH = 120;

/** Returns the problem to show, or null when the draft is saveable. */
export function validateHeadlinePayload(payload: HeadlinePayload): string | null {
    if (!payload.fullName) return 'Full name cannot be empty';
    if ((payload.headline ?? '').length > HEADLINE_MAX_LENGTH) {
        return `Headline must be ${HEADLINE_MAX_LENGTH} characters or fewer`;
    }
    return null;
}
