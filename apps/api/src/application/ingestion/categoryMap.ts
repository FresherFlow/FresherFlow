/**
 * Phase 13 - keyword category mapping.
 *
 * Feeds rarely send a valid `OpportunityCategory`. When the category is
 * missing or unknown, guessing from title + description beats defaulting
 * everything to EMPLOYMENT: a "Hackathon" labelled EMPLOYMENT pollutes job
 * filters, while a wrong guess here is still reviewable because ingestion
 * only ever creates DRAFT.
 *
 * Pure function: no database, no network. Bounded inputs so an adversarial
 * feed cannot turn mapping into a ReDoS or memory sink.
 */

import { OpportunityCategory } from '@fresherflow/database';

const MAX_TEXT = 10_000;

const RULES: Array<{ category: OpportunityCategory; pattern: RegExp }> = [
    {
        category: OpportunityCategory.COMPETITION,
        pattern: /\b(hackathon|hack-a-thon|competition|contest|coding\s?challenge|ideathon|datathon|ctf|capture\s+the\s+flag|olympiad|quiz\s+contest)\b/i,
    },
    {
        category: OpportunityCategory.SCHOLARSHIP,
        pattern: /\b(scholarship|fellowship|grant\s+for\s+students|tuition\s+waiver|merit\s+scholarship|means\s+scholarship)\b/i,
    },
    {
        category: OpportunityCategory.EDUCATION,
        pattern: /\b(course|bootcamp|certification|training\s+program|workshop\s+course|nanodegree|diploma\s+program|learnership|cohort\s+program)\b/i,
    },
    {
        category: OpportunityCategory.EVENT,
        pattern: /\b(webinar|meetup|conference|summit|workshop|seminar|conclave|job\s+fair|career\s+fair|hiring\s+drive\s+event|tech\s+talk)\b/i,
    },
];

/**
 * Infer a category from free text. Returns null when nothing matches so the
 * caller can fall back to the source default — null means "unknown", not
 * "employment".
 */
export function mapCategoryFromText(title: unknown, description: unknown): OpportunityCategory | null {
    const parts: string[] = [];
    if (typeof title === 'string' && title.length > 0) parts.push(title.slice(0, 500));
    if (typeof description === 'string' && description.length > 0) parts.push(description.slice(0, MAX_TEXT));
    if (parts.length === 0) return null;

    const text = parts.join('\n');
    if (text.length > MAX_TEXT + 500) return null;

    for (const rule of RULES) {
        if (rule.pattern.test(text)) return rule.category;
    }
    return null;
}
