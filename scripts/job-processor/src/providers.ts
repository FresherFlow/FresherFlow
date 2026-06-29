import { GoogleGenAI } from '@google/genai';
import { ExtractedJob, jobSchema, normalizeRawJson } from './normalizer';

/**
 * Focused formatting prompt — handles ONLY the 4 fields that need LLM understanding.
 * All structured fields (title, company, skills, location, degrees, years, workMode)
 * are extracted natively by the template parser + CDN metadata. No overlap.
 */
export const formattingSystemInstruction = `You are an expert HR content formatter for FresherFlow, a fresher job platform.
Your task: read raw job description text and return a JSON object with EXACTLY these 4 fields:
"description", "notesHighlights", "incentives", "selectionProcess".

RULES FOR "description":
- Must contain 80-90% of all useful job information.
- Use bold section headers: **About the Role**, **Responsibilities**, **Requirements**, **Eligibility**. No markdown hashtags.
- Use hyphen bullet lists (- ) for duties/qualifications. Separate sections with \\n\\n.
- Do NOT repeat skills already listed in a skills tag — mention them only when the JD strongly emphasizes them.
- Delete all clickbait, aggregator disclaimers, "How to Apply" links, cookie notices, navigation menus.
- Do NOT include Location, Salary, or Company boilerplate — those are handled by structured fields.

RULES FOR "notesHighlights":
- ONLY for special callouts: shift timing, bond/service agreement, immediate joiner, own laptop required, PPO opportunity, mandatory relocation, special eligibility restriction, walk-in venue/date.
- Max 1-3 short bullet points. If nothing qualifies, return "".
- DO NOT put skills, requirements, responsibilities, or educational requirements here.

RULES FOR "incentives":
- Extract actual employee benefits: Health/Medical/Accident Insurance, Cab Facility, Shift Allowance, Meal Benefits, Joining/Annual Bonus, PPO, Flexible Work, Learning Programs, Certification Support, Wellness Benefits.
- Check explicitly before returning "": insurance, medical, cab, bonus, PPO, allowances, learning programs.
- Do NOT copy generic culture statements like "We value diversity" or "Great place to work".
- If none are explicitly mentioned, return "".

RULES FOR "selectionProcess":
- Extract any explicitly mentioned hiring stages: Online Test, Aptitude Test, Technical Interview, HR Interview, Group Discussion, etc.
- Format as a short numbered or bulleted list if multiple stages are mentioned.
- If not mentioned in the JD, return "".

RULES FOR "customSlug":
- Provide a clean, SEO-friendly URL slug for the job based on the title and company (e.g., "software-engineer-google").
- Keep it lowercase and use hyphens for spaces.

CRITICAL:
- Return raw JSON only. No markdown code fences. No preamble.
- Escape newlines as \\n inside string values.
- Never invent or infer information not present in the source text.`;

export type FormattedFields = {
    description: string;
    notesHighlights: string;
    incentives: string;
    selectionProcess: string;
    customSlug: string;
};

// Call Gemini API to extract structured fields (with retry)
export async function extractJobWithGemini(
    ai: GoogleGenAI | null,
    text: string,
    applyLink: string,
    systemInstruction: string,
    attempt = 1
): Promise<ExtractedJob | null> {
    if (!ai) {
        throw new Error("Gemini API client not initialized. GEMINI_API_KEY is missing.");
    }
    if (!text || text.length < 50) {
        console.warn("Input text is too short to parse.");
        return null;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Apply Link: ${applyLink}\n\nHere is the raw job description text:\n\n${text}`,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'OBJECT',
                    properties: {
                        type: { type: 'STRING', enum: ['JOB', 'INTERNSHIP', 'WALKIN'] },
                        title: { type: 'STRING' },
                        company: { type: 'STRING' },
                        companyWebsite: { type: 'STRING' },
                        description: { type: 'STRING' },
                        allowedDegrees: { type: 'ARRAY', items: { type: 'STRING' } },
                        allowedCourses: { type: 'ARRAY', items: { type: 'STRING' } },
                        allowedSpecializations: { type: 'ARRAY', items: { type: 'STRING' } },
                        allowedPassoutYears: { type: 'ARRAY', items: { type: 'INTEGER' } },
                        requiredSkills: { type: 'ARRAY', items: { type: 'STRING' } },
                        locations: { type: 'ARRAY', items: { type: 'STRING' } },
                        workMode: { type: 'STRING', enum: ['ONSITE', 'HYBRID', 'REMOTE'] },
                        experienceMin: { type: 'INTEGER' },
                        experienceMax: { type: 'INTEGER' },
                        salaryRange: { type: 'STRING' },
                        salaryAmount: { type: 'STRING' },
                        salaryPeriod: { type: 'STRING', enum: ['MONTHLY', 'YEARLY'] },
                        employmentType: { type: 'STRING' },
                        jobFunction: { type: 'STRING' },
                        incentives: { type: 'STRING' },
                        selectionProcess: { type: 'STRING' },
                        notesHighlights: { type: 'STRING' },
                        applyLink: { type: 'STRING' },
                        customSlug: { type: 'STRING' },
                        expiresAt: { type: 'STRING' },
                        venueAddress: { type: 'STRING' },
                        venueLink: { type: 'STRING' },
                        dateRange: { type: 'STRING' },
                        timeRange: { type: 'STRING' },
                        requiredDocuments: { type: 'ARRAY', items: { type: 'STRING' } },
                        contactPerson: { type: 'STRING' },
                        contactPhone: { type: 'STRING' },
                        startDate: { type: 'STRING' },
                        endDate: { type: 'STRING' },
                        startTime: { type: 'STRING' },
                        endTime: { type: 'STRING' },
                        walkInDetails: {
                            type: 'OBJECT',
                            properties: {
                                dateRange: { type: 'STRING' },
                                timeRange: { type: 'STRING' },
                                reportingTime: { type: 'STRING' },
                                dates: { type: 'ARRAY', items: { type: 'STRING' } },
                                venueAddress: { type: 'STRING' },
                                venueLink: { type: 'STRING' },
                                requiredDocuments: { type: 'ARRAY', items: { type: 'STRING' } },
                                contactPerson: { type: 'STRING' },
                                contactPhone: { type: 'STRING' }
                            }
                        }
                    },
                    required: [
                        'type', 'title', 'company', 'companyWebsite', 'description',
                        'allowedDegrees', 'allowedCourses', 'allowedSpecializations', 'allowedPassoutYears',
                        'requiredSkills', 'locations', 'workMode',
                        'experienceMin', 'experienceMax',
                        'salaryRange', 'salaryAmount', 'salaryPeriod',
                        'employmentType', 'jobFunction', 'incentives',
                        'selectionProcess', 'notesHighlights', 'applyLink', 'customSlug', 'expiresAt',
                        'venueAddress', 'venueLink', 'dateRange', 'timeRange',
                        'requiredDocuments', 'contactPerson', 'contactPhone',
                        'startDate', 'endDate', 'startTime', 'endTime', 'walkInDetails'
                    ],
                }
            }
        });

        const jsonText = response.text;
        if (!jsonText) {
            throw new Error("Empty response from Gemini API");
        }

        const rawJson = JSON.parse(jsonText) as Record<string, unknown>;
        const validated = jobSchema.parse(normalizeRawJson(rawJson));
        return validated;
    } catch (err) {
        const errMsg = (err as Error).message || String(err);
        
        // 1. Check for Daily Quota exhaustion
        if (
            errMsg.includes('free_tier_requests') || 
            errMsg.includes('GenerateRequestsPerDay') || 
            errMsg.includes('limit: 20') ||
            errMsg.includes('Quota exceeded')
        ) {
            console.error("\n[CRITICAL] Gemini daily quota limit reached.");
            throw new Error("GEMINI_DAILY_QUOTA_EXHAUSTED");
        }
        
        // 2. Check for temporary 429 Rate Limit (RPM / TPM)
        const errStatus = err && typeof err === 'object' && 'status' in err ? (err as { status: unknown }).status : undefined;
        const isRateLimit = errStatus === 429 || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED');
        if (isRateLimit && attempt < 5) {
            // Extract retry delay if available
            let delayMs = 60000; // default to 60s
            const match = errMsg.match(/retry in (\d+(?:\.\d+)?)s/i);
            if (match) {
                const seconds = parseFloat(match[1]);
                delayMs = Math.ceil((seconds + 2) * 1000); // add 2s buffer
            }
            console.log(`[Rate Limit] Gemini rate limited (429). Retrying attempt ${attempt}/5 in ${Math.round(delayMs / 1000)} seconds...`);
            await new Promise(r => setTimeout(r, delayMs));
            return extractJobWithGemini(ai, text, applyLink, systemInstruction, attempt + 1);
        }
        
        // 3. General retries for other errors
        console.error(`Gemini attempt ${attempt}/3 failed:`, errMsg);
        if (attempt < 3) {
            console.log("Retrying in 5 seconds...");
            await new Promise(r => setTimeout(r, 5000));
            return extractJobWithGemini(ai, text, applyLink, systemInstruction, attempt + 1);
        }
        return null;
    }
}

// Call Gemini API to format the description and extract notes/incentives/selectionProcess
export async function formatJobDescriptionWithGemini(
    ai: GoogleGenAI | null,
    text: string,
    attempt = 1
): Promise<FormattedFields | null> {
    if (!ai) return null;
    if (!text || text.length < 50) return null;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Raw Text:\n\n${text}`,
            config: {
                systemInstruction: formattingSystemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'OBJECT',
                    properties: {
                        description: { type: 'STRING' },
                        notesHighlights: { type: 'STRING' },
                        incentives: { type: 'STRING' },
                        selectionProcess: { type: 'STRING' },
                        customSlug: { type: 'STRING' }
                    },
                    required: ['description', 'notesHighlights', 'incentives', 'selectionProcess', 'customSlug']
                }
            }
        });

        const jsonText = response.text;
        if (!jsonText) return null;

        const parsed = JSON.parse(jsonText) as FormattedFields;
        return {
            description: parsed.description || '',
            notesHighlights: parsed.notesHighlights || '',
            incentives: parsed.incentives || '',
            selectionProcess: parsed.selectionProcess || '',
            customSlug: parsed.customSlug || ''
        };
    } catch (err) {
        const errMsg = (err as Error).message || String(err);
        
        if (errMsg.includes('free_tier_requests') || errMsg.includes('GenerateRequestsPerDay') || errMsg.includes('limit: 20') || errMsg.includes('Quota exceeded')) {
            throw new Error("GEMINI_DAILY_QUOTA_EXHAUSTED");
        }
        
        console.error(`Gemini formatting attempt ${attempt}/3 failed:`, errMsg);
        if (attempt < 3) {
            await new Promise(r => setTimeout(r, 2000));
            return formatJobDescriptionWithGemini(ai, text, attempt + 1);
        }
        throw err;
    }
}

export async function formatJobDescriptionWithGroq(text: string, attempt = 1): Promise<FormattedFields | null> {
    const key = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    if (!key) return null;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: formattingSystemInstruction },
                    { role: 'user', content: `Raw Text:\n\n${text}` }
                ],
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Groq API returned status ${response.status}: ${body}`);
        }

        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        const jsonText = data.choices?.[0]?.message?.content;
        if (!jsonText) throw new Error("Empty response from Groq");

        const parsed = JSON.parse(jsonText) as Partial<FormattedFields>;
        if (typeof parsed.description !== 'string') throw new Error("Invalid schema from Groq");
        return {
            description: parsed.description,
            notesHighlights: parsed.notesHighlights || '',
            incentives: parsed.incentives || '',
            selectionProcess: parsed.selectionProcess || '',
            customSlug: parsed.customSlug || ''
        };
    } catch (err) {
        console.error(`Groq formatting attempt ${attempt}/3 failed:`, (err as Error).message);
        if (attempt < 3) {
            await new Promise(r => setTimeout(r, 2000));
            return formatJobDescriptionWithGroq(text, attempt + 1);
        }
        return null;
    }
}

export async function formatJobDescriptionWithOpenRouter(text: string, attempt = 1): Promise<FormattedFields | null> {
    const key = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
    if (!key) return null;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://fresherflow.in',
                'X-Title': 'FresherFlow'
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: formattingSystemInstruction },
                    { role: 'user', content: `Raw Text:\n\n${text}` }
                ],
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`OpenRouter API returned status ${response.status}: ${body}`);
        }

        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        const jsonText = data.choices?.[0]?.message?.content;
        if (!jsonText) throw new Error("Empty response from OpenRouter");

        const parsed = JSON.parse(jsonText) as Partial<FormattedFields>;
        if (typeof parsed.description !== 'string') throw new Error("Invalid schema from OpenRouter");
        return {
            description: parsed.description,
            notesHighlights: parsed.notesHighlights || '',
            incentives: parsed.incentives || '',
            selectionProcess: parsed.selectionProcess || '',
            customSlug: parsed.customSlug || ''
        };
    } catch (err) {
        console.error(`OpenRouter formatting attempt ${attempt}/3 failed:`, (err as Error).message);
        if (attempt < 3) {
            await new Promise(r => setTimeout(r, 2000));
            return formatJobDescriptionWithOpenRouter(text, attempt + 1);
        }
        return null;
    }
}

export async function formatJobDescriptionWithFallback(ai: GoogleGenAI | null, text: string): Promise<FormattedFields | null> {
    // 1. Try Groq
    if (process.env.GROQ_API_KEY) {
        console.log("Formatting description using Groq...");
        const res = await formatJobDescriptionWithGroq(text);
        if (res) return res;
    }

    // 2. Try OpenRouter
    if (process.env.OPENROUTER_API_KEY) {
        console.log("Formatting description using OpenRouter...");
        const res = await formatJobDescriptionWithOpenRouter(text);
        if (res) return res;
    }

    // 3. Try Gemini
    if (ai) {
        console.log("Formatting description using Gemini...");
        try {
            const res = await formatJobDescriptionWithGemini(ai, text);
            if (res) return res;
        } catch (err) {
            if ((err as Error).message === "GEMINI_DAILY_QUOTA_EXHAUSTED") {
                console.log("[WARNING] Gemini daily quota reached during formatting.");
                throw err;
            }
            console.error("Gemini formatting failed:", err);
        }
    }

    return null;
}

export async function extractWithGroq(text: string, applyLink: string, systemInstruction: string, attempt = 1): Promise<ExtractedJob | null> {
    const key = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    if (!key) return null;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: `Apply Link: ${applyLink}\n\nHere is the raw job description text:\n\n${text}` }
                ],
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Groq API returned status ${response.status}: ${body}`);
        }

        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        const jsonText = data.choices?.[0]?.message?.content;
        if (!jsonText) throw new Error("Empty response from Groq");

        const rawJson = JSON.parse(jsonText) as Record<string, unknown>;
        const validated = jobSchema.parse(normalizeRawJson(rawJson));
        return validated;
    } catch (err) {
        console.error(`Groq attempt ${attempt}/3 failed:`, (err as Error).message);
        if (attempt < 3) {
            await new Promise(r => setTimeout(r, 3000));
            return extractWithGroq(text, applyLink, systemInstruction, attempt + 1);
        }
        return null;
    }
}

export async function extractWithOpenRouter(text: string, applyLink: string, systemInstruction: string, attempt = 1): Promise<ExtractedJob | null> {
    const key = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
    if (!key) return null;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://fresherflow.in',
                'X-Title': 'FresherFlow Job Processor'
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: `Apply Link: ${applyLink}\n\nHere is the raw job description text:\n\n${text}` }
                ],
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`OpenRouter API returned status ${response.status}: ${body}`);
        }

        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        const jsonText = data.choices?.[0]?.message?.content;
        if (!jsonText) throw new Error("Empty response from OpenRouter");

        const rawJson = JSON.parse(jsonText) as Record<string, unknown>;
        const validated = jobSchema.parse(normalizeRawJson(rawJson));
        return validated;
    } catch (err) {
        console.error(`OpenRouter attempt ${attempt}/3 failed:`, (err as Error).message);
        if (attempt < 3) {
            await new Promise(r => setTimeout(r, 3000));
            return extractWithOpenRouter(text, applyLink, systemInstruction, attempt + 1);
        }
        return null;
    }
}

export async function extractJobWithFallback(
    ai: GoogleGenAI | null,
    text: string,
    applyLink: string,
    systemInstruction: string
): Promise<ExtractedJob | null> {
    interface Provider {
        name: string;
        fn: () => Promise<ExtractedJob | null>;
    }

    const providers: Provider[] = [];
    
    if (process.env.GROQ_API_KEY) {
        providers.push({ name: 'Groq', fn: () => extractWithGroq(text, applyLink, systemInstruction) });
    }
    if (process.env.OPENROUTER_API_KEY) {
        providers.push({ name: 'OpenRouter', fn: () => extractWithOpenRouter(text, applyLink, systemInstruction) });
    }
    if (process.env.GEMINI_API_KEY) {
        providers.push({ name: 'Gemini', fn: () => extractJobWithGemini(ai, text, applyLink, systemInstruction) });
    }

    if (providers.length === 0) {
        throw new Error("No AI API keys configured. Set GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY in .env");
    }

    let isGeminiQuotaExhausted = false;

    for (const provider of providers) {
        try {
            console.log(`Attempting extraction using ${provider.name}...`);
            const result = await provider.fn();
            if (result) {
                console.log(`Successfully extracted job details using ${provider.name}!`);
                return result;
            }
        } catch (err) {
            console.warn(`Extraction with ${provider.name} failed:`, (err as Error).message);
            if ((err as Error).message === "GEMINI_DAILY_QUOTA_EXHAUSTED") {
                isGeminiQuotaExhausted = true;
                if (providers.length > 1) {
                    console.log("Daily Gemini limit reached; falling back to next available provider.");
                }
            }
        }
    }

    if (isGeminiQuotaExhausted) {
        throw new Error("GEMINI_DAILY_QUOTA_EXHAUSTED");
    }

    return null;
}
