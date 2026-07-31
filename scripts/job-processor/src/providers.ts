import { GoogleGenAI } from '@google/genai';

// ─────────────────────────────────────────────────────────────────────────────
// TARGETED ENRICHMENT — LLM only fills the fields we couldn't map natively
// ─────────────────────────────────────────────────────────────────────────────

export type EnrichableField = 
    | 'description'
    | 'requiredSkills'
    | 'salaryRange'
    | 'employmentType'
    | 'incentives'
    | 'notesHighlights'
    | 'selectionProcess'
    | 'customSlug';

export interface TargetedEnrichmentResult {
    description?: string;
    requiredSkills?: string[];
    salaryRange?: string;
    employmentType?: string;
    incentives?: string;
    notesHighlights?: string;
    selectionProcess?: string;
    customSlug?: string;
}

function buildTargetedPrompt(missingFields: EnrichableField[]): string {
    const fieldRules: Record<EnrichableField, string> = {
        description: 'Clean, structured markdown description. Use **bold headers** and hyphen bullet lists. Remove nav, cookies, login noise.',
        requiredSkills: 'Array of technical skill strings (e.g. ["Java", "React", "SQL"]).',
        salaryRange: 'Salary string if mentioned, e.g. "3-5 LPA" or "₹25,000/month". Empty string if not found.',
        employmentType: 'E.g. "Full Time", "Part Time", "Contract", "Internship".',
        incentives: 'Employee benefits mentioned: health insurance, cab, food, bonus, PPO, etc. Empty string if none.',
        notesHighlights: 'Special callouts only: bond, own laptop, immediate joiner, PPO, walk-in details. Must be a single STRING (not an array) containing bullet points. Empty string if none.',
        selectionProcess: 'Hiring stages if explicitly stated. Must be a single STRING (not an array) containing bullet points. Empty string if not stated.',
        customSlug: 'SEO slug e.g. "software-engineer-tcs". Lowercase hyphen-separated.',
    };

    const fieldDescriptions = missingFields.map(f => `- "${f}": ${fieldRules[f]}`).join('\n');
    return `You are an expert HR data extractor for FresherFlow (a fresher job platform).
Read the job description and extract ONLY these missing fields:
${fieldDescriptions}

Return raw JSON with ONLY these keys. No extra keys. No markdown fences.
Escape newlines as \\n in string values.
Never invent information not in the source text.`;
}

/**
 * Targeted LLM enrichment — calls Gemini for ONLY the fields that
 * couldn't be mapped deterministically. Much cheaper than full extraction.
 */
export async function enrichMissingFields(
    ai: GoogleGenAI | null,
    text: string,
    missingFields: EnrichableField[],
    attempt = 1
): Promise<TargetedEnrichmentResult | null> {
    if (!ai || missingFields.length === 0 || !text || text.length < 50) return null;

    try {
        const systemPrompt = buildTargetedPrompt(missingFields);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Job Description:\n\n${text}`,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json',
            }
        });

        const jsonText = response.text;
        if (!jsonText) return null;
        return JSON.parse(jsonText) as TargetedEnrichmentResult;
    } catch (err) {
        const errMsg = (err as Error).message || '';
        if (errMsg.includes('free_tier_requests') || errMsg.includes('Quota exceeded') || errMsg.includes('GenerateRequestsPerDay')) {
            throw new Error('GEMINI_DAILY_QUOTA_EXHAUSTED');
        }
        const isRateLimit = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED');
        if (isRateLimit && attempt < 4) {
            const delay = attempt * 30000;
            console.log(`[Enrichment] Rate limited. Retrying in ${delay / 1000}s...`);
            await new Promise(r => setTimeout(r, delay));
            return enrichMissingFields(ai, text, missingFields, attempt + 1);
        }
        if (attempt < 3) {
            await new Promise(r => setTimeout(r, 3000));
            return enrichMissingFields(ai, text, missingFields, attempt + 1);
        }
        console.warn('[Enrichment] LLM enrichment failed after retries:', errMsg);
        return null;
    }
}
