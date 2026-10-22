import { apiFetch, jsonHeaders } from '../http/client.js';
import { SubmitOpportunityInput, SubmitOpportunityOutput } from '../schemas.js';

/**
 * Submission life cycle: submit, read your own, withdraw, and — for a moderator
 * — the review queue and its decisions.
 *
 * Two rules this module exists to keep straight:
 *  - the server never fetches `jobUrl` / `sourceUrl`; they are stored as data;
 *  - the status in a response is the database's status, never a guess, because
 *    the agent repeats it to the user.
 */

// ─── submit_opportunity ──────────────────────────────────────────────────────

/**
 * Submit an opportunity. The API decides the outcome from the caller's role:
 * a moderator's submission is published, every other account's is a DRAFT.
 */
export async function submitOpportunity(input: SubmitOpportunityInput): Promise<SubmitOpportunityOutput> {
    const body: Record<string, unknown> = {
        title: input.title,
        companyName: input.companyName,
        jobUrl: input.jobUrl,
    };
    if (input.location) body.location = input.location;
    if (input.employmentType) body.employmentType = input.employmentType;
    if (input.category) body.category = input.category;
    if (input.dates) body.dates = input.dates;
    if (input.dateRange) body.dateRange = input.dateRange;
    if (input.timeRange) body.timeRange = input.timeRange;
    if (input.venueAddress) body.venueAddress = input.venueAddress;
    if (input.salary) body.salary = input.salary;
    if (input.description) body.description = input.description;
    if (input.eligibility) body.eligibility = input.eligibility;
    if (input.skills) body.skills = input.skills;
    if (input.passoutYears) body.passoutYears = input.passoutYears;
    if (input.sourceUrl) body.sourceUrl = input.sourceUrl;
    if (input.contactEmail) body.contactEmail = input.contactEmail;

    const data = await apiFetch<SubmitOpportunityOutput>('/api/opportunities/mcp-submit', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(body),
    });

    return SubmitOpportunityOutput.parse(data);
}

// ─── the caller's own submissions ────────────────────────────────────────────

export type OwnSubmission = {
    id: string;
    title: string | null;
    company: string | null;
    sourceUrl: string | null;
    applyUrl: string | null;
    status: string;
    createdAt: string;
    opportunityId: string | null;
    extractedData?: Record<string, unknown> | null;
    opportunity?: {
        id: string;
        slug: string | null;
        status: string;
        deletedAt: string | null;
        deletionReason: string | null;
    } | null;
};

export type SubmissionListResponse = {
    submissions: OwnSubmission[];
    total: number;
    status: string;
};

/** The caller's own submission history, newest first. */
export async function listMySubmissions(status?: string): Promise<SubmissionListResponse> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiFetch<SubmissionListResponse>(`/api/internal/mcp/submissions${query}`);
}

export type WithdrawResponse = {
    success: boolean;
    submissionId: string;
    listingState: 'archived' | 'none';
    message: string;
};

/** Take back a submission that is still awaiting review. */
export async function withdrawSubmission(submissionId: string): Promise<WithdrawResponse> {
    return apiFetch<WithdrawResponse>(
        `/api/internal/mcp/submissions/${encodeURIComponent(submissionId)}/withdraw`,
        { method: 'POST' },
    );
}

// ─── moderation ──────────────────────────────────────────────────────────────

/** A review-queue row, which is moderator-visible and includes the submitter. */
export type ReviewSubmission = OwnSubmission & {
    description: string | null;
    submittedBy?: { id: string; username: string | null; fullName: string | null } | null;
};

export type ReviewQueueResponse = {
    submissions: ReviewSubmission[];
    pendingCount: number;
    status: string;
};

/** The moderation queue. Requires the opportunity.review permission. */
export async function getReviewQueue(status?: string): Promise<ReviewQueueResponse> {
    const query = status ? `?submissionStatus=${encodeURIComponent(status)}` : '';
    return apiFetch<ReviewQueueResponse>(`/api/internal/mcp/review-queue${query}`);
}

export type ModerationResult = {
    success: boolean;
    submissionId: string;
    opportunityId?: string;
    slug?: string | null;
    published: boolean;
    message: string;
};

/** Publish the linked listing. Requires opportunity.publish. */
export async function approveSubmissionTool(submissionId: string): Promise<ModerationResult> {
    return apiFetch<ModerationResult>(
        `/api/internal/mcp/review-queue/${encodeURIComponent(submissionId)}/approve`,
        { method: 'POST' },
    );
}

/** Reject the linked listing with an optional reason. Requires opportunity.review. */
export async function rejectSubmissionTool(
    submissionId: string,
    reason?: string,
): Promise<ModerationResult> {
    return apiFetch<ModerationResult>(
        `/api/internal/mcp/review-queue/${encodeURIComponent(submissionId)}/reject`,
        {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({ ...(reason ? { reason } : {}) }),
        },
    );
}
