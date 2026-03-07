export type NormalizedOpportunityLinks = {
    sourceLink?: string;
    applyLink?: string;
};

function normalizeUrl(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeOpportunityLinks(
    sourceLink: unknown,
    applyLink: unknown
): NormalizedOpportunityLinks {
    const normalizedSourceLink = normalizeUrl(sourceLink);
    const normalizedApplyLink = normalizeUrl(applyLink);

    if (normalizedSourceLink && normalizedApplyLink) {
        return {
            sourceLink: normalizedSourceLink,
            applyLink: normalizedApplyLink,
        };
    }

    if (normalizedSourceLink) {
        return {
            sourceLink: normalizedSourceLink,
            applyLink: normalizedSourceLink,
        };
    }

    if (normalizedApplyLink) {
        return {
            sourceLink: undefined,
            applyLink: normalizedApplyLink,
        };
    }

    return {};
}
