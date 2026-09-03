import { Opportunity } from '@fresherflow/types';

const BOILERPLATE_PATTERNS = [
    /https?:\/\/\S+/gi,
    /www\.\S+/gi,
    /Verified on FresherFlow(\s*\(fresherflow\.in\))?/gi,
    /fresherflow\.in/gi,
    /\b(location|work mode|degree|branch|batches|dates|venue|salary|req|apply here|eligible|eligibility):/gi,
    /\bat\b/gi,
];

// Emoji regex covering emojis and symbols
const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F680}-\u{1F6FF}]/gu;

/**
 * Sanitizes a raw search input string (including messy pasted text, URLs, emojis, and markdown).
 * If someone pastes a whole share text or URL, extracts only the core searchable job keywords.
 */
export function sanitizeSearchQuery(query: string): string {
    if (!query) return '';
    let cleaned = query.trim();

    // 1. If user pasted a FresherFlow job URL, extract the slug keywords
    const urlMatch = cleaned.match(/https?:\/\/[^\s/]+\/(?:jobs|opportunities)\/([a-zA-Z0-9-]+)/i);
    if (urlMatch && urlMatch[1]) {
        const slugWords = urlMatch[1]
            .replace(/-[a-f0-9]{6,12}$/i, '')
            .replace(/-at-/gi, ' ')
            .replace(/-/g, ' ')
            .trim();
        if (slugWords.length > 2) {
            return slugWords;
        }
    }

    // 2. Remove URLs and known boilerplate labels
    for (const pattern of BOILERPLATE_PATTERNS) {
        cleaned = cleaned.replace(pattern, ' ');
    }

    // 3. Remove emojis
    cleaned = cleaned.replace(EMOJI_REGEX, ' ');

    // 4. Remove markdown symbols (*, _, `, ~, #)
    cleaned = cleaned.replace(/[*_`~#]/g, ' ');

    // 5. Normalize punctuation and whitespace
    cleaned = cleaned.replace(/[-,/\\|:;()[\]{}]/g, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // 6. Cap search query length to avoid URL pollution
    if (cleaned.length > 80) {
        const words = cleaned.split(' ').slice(0, 6);
        cleaned = words.join(' ');
    }

    return cleaned;
}

/**
 * Tokenizes a sanitized search string into lowercase search keywords (ignoring short stop words).
 */
export function extractSearchTokens(query: string): string[] {
    const cleaned = sanitizeSearchQuery(query);
    if (!cleaned) return [];

    const stopWords = new Set(['and', 'or', 'the', 'in', 'of', 'for', 'to', 'is', 'on', 'with', 'by']);
    return cleaned
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length >= 2 && !stopWords.has(word));
}

/**
 * Robust fuzzy search matcher for an opportunity against a search query.
 */
export function opportunityMatchesSearch(opp: Opportunity, rawQuery: string): boolean {
    if (!rawQuery || !rawQuery.trim()) return true;

    const tokens = extractSearchTokens(rawQuery);
    if (tokens.length === 0) return true;

    const govtDetails = opp.governmentJobDetails as unknown as Record<string, unknown> | undefined;

    // Aggregate all searchable text fields into one lowercased string
    const searchableCorpus = [
        opp.title,
        opp.normalizedRole,
        opp.company,
        ...(opp.locations || []),
        ...((opp as any).skills || opp.requiredSkills || []),
        ...((opp as any).allowedCourses || []),
        ...((opp as any).allowedDegrees || []),
        ...((opp as any).roles || []),
        ...((opp as any).categories || []),
        govtDetails?.recruitingBody,
        govtDetails?.organization,
        govtDetails?.department,
        govtDetails?.examName,
        govtDetails?.postName,
        govtDetails?.advertisementNumber,
        ...(Array.isArray(govtDetails?.jobCategory) ? govtDetails.jobCategory : []),
        govtDetails?.minimumQualification,
        opp.description,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    // 1. Direct whole-cleaned substring match
    const sanitizedPhrase = sanitizeSearchQuery(rawQuery).toLowerCase();
    if (sanitizedPhrase && searchableCorpus.includes(sanitizedPhrase)) {
        return true;
    }

    // 2. Token overlap match (e.g. if searching multiple terms, match if all or most tokens match)
    const matchingTokens = tokens.filter((token) => searchableCorpus.includes(token));

    // If query has 1-3 tokens, all must match. If query is longer, require >= 50% match.
    if (tokens.length <= 3) {
        return matchingTokens.length === tokens.length;
    }

    const matchRatio = matchingTokens.length / tokens.length;
    return matchRatio >= 0.5 || matchingTokens.length >= 3;
}
