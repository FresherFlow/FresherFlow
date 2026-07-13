import { CANONICAL_SKILLS_MAP } from '../metadata.js';

export interface ParsedGreenhouseData {
    description: string;
    requiredSkills: string[];
    allowedDegrees: string[];
    allowedCourses: string[];
    experienceMin?: number;
    experienceMax?: number;
    incentives?: string;
    selectionProcess?: string;
    workplaceType?: 'ONSITE' | 'HYBRID' | 'REMOTE' | null;
}

// Soft skills / generic words that should NOT be added as technical skills
const SOFT_SKILL_BLOCKLIST = new Set([
    'english', 'fluent', 'communication', 'communication skills', 'written communication',
    'verbal communication', 'written and verbal communication', 'presentation skills',
    'interpersonal skills', 'teamwork', 'team player', 'problem solving', 'problem-solving',
    'critical thinking', 'attention to detail', 'time management', 'multitasking',
    'self-motivated', 'proactive', 'ownership', 'leadership', 'collaboration', 'adaptability',
    'organization', 'organizational skills', 'analytical skills', 'analytical', 'creativity',
    'innovation', 'drive', 'motivation', 'fast learner', 'quick learner', 'coachable',
    'detail-oriented', 'detail oriented', 'growth mindset', 'result-oriented', 'results-oriented',
]);

// Location strings that are department/office names, not actual city/region locations
const FAKE_LOCATION_PATTERNS = [
    /^corporate$/i,
    /^platforms$/i,
    /^engineering$/i,
    /^product$/i,
    /^design$/i,
    /^sales$/i,
    /^finance$/i,
    /^operations$/i,
    /^hr$/i,
    /^marketing$/i,
    /^remote office$/i,
    /office$/i,       // e.g. "Bangalore Office", "Mumbai Office"
    /limited$/i,      // e.g. "PhonePe Limited", "Razorpay Software Private Limited"
    /private limited$/i,
    /pvt\.?\s*ltd\.?$/i,
    /inc\.?$/i,
    /llc\.?$/i,
    /ltd\.?$/i,
    /^hq$/i,
    /headquarters$/i,
];

function isRealLocation(loc: string): boolean {
    const trimmed = loc.trim();
    if (!trimmed || trimmed.length < 2) return false;
    for (const pattern of FAKE_LOCATION_PATTERNS) {
        if (pattern.test(trimmed)) return false;
    }
    return true;
}

function cleanHtmlToMarkdown(html: string): string {
    if (!html) return '';
    return html
        // Replace paragraph tags with newlines
        .replace(/<p[^>]*>/gi, ' ')
        .replace(/<\/p>/gi, '\n\n')
        // Replace bold/strong tags with double asterisks
        .replace(/<strong[^>]*>/gi, '**')
        .replace(/<\/strong>/gi, '**')
        .replace(/<b[^>]*>/gi, '**')
        .replace(/<\/b>/gi, '**')
        // Replace list items with bullet dashes
        .replace(/<li[^>]*>/gi, '- ')
        .replace(/<\/li>/gi, '\n')
        // Replace list containers
        .replace(/<ul[^>]*>/gi, ' ')
        .replace(/<\/ul>/gi, '\n')
        .replace(/<ol[^>]*>/gi, ' ')
        .replace(/<\/ol>/gi, '\n')
        // Replace headings with bold markdown headers
        .replace(/<h[1-6][^>]*>/gi, '\n**')
        .replace(/<\/h[1-6]>/gi, '**\n')
        // Decode HTML entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        // Remove other HTML tags
        .replace(/<[^>]+>/g, ' ')
        // Clean up redundant spaces and newlines
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\n{2,}-\s/g, '\n- ')
        .trim();
}

// Common boilerplate lines that companies paste at the end of every job description.
// These add zero value for candidates — strip them deterministically.
const BOILERPLATE_TRIGGERS: string[] = [
    // EEO / diversity
    'equal opportunity employer',
    'equal employment opportunity',
    'proud to foster a workplace free from discrimination',
    'we do not discriminate',
    'commitment to diversity',
    'we welcome applications from candidates of all backgrounds',
    'we believe it\'s the right thing for our people',
    'candidates who bring unique perspectives',
    'we are an equal',
    'eeo statement',
    'affirmative action',
    'reasonable accommodation',
    'if you need assistance',
    'individuals with disabilities',
    'applicants will receive consideration',
    // Privacy / legal
    'job applicant privacy notice',
    'applicant privacy notice',
    'california consumer privacy act',
    'ccpa',
    'privacy policy',
    // Social / tracking tags
    '#li-remote',
    '#li-',
    'follow us on linkedin',
    'follow us on twitter',
    // Cookie / website boilerplate (mthree)
    'cookie policy',
    'by using our website you consent',
    'accept all',
    // Salary range disclaimer (YipitData)
    'by a number of factors, including, but not limited to, the applicant\'s experience',
    'internal team benchmarks',
    // Generic marketing closers (Smartsheet)
    'let\'s build what\'s next, together',
    'that\'s magic at work',
];

// These triggers are always boilerplate — remove them anywhere in the text.
const ALWAYS_STRIP_TRIGGERS: string[] = [
    'we welcome applications from candidates of all backgrounds',
    'we believe it\'s the right thing for our people',
    'candidates who bring unique perspectives',
    'modinclusion',
    // Cookie / website boilerplate (mthree)
    'cookie policy',
    'by using our website you consent',
    'this website uses cookies',
    'accept all',
    // Application form HTML leaking through (Modulr)
    'submit application',
    'powered by greenhouse',
    'powered by\n',
    // Social / tracking tags
    '#li-remote',
    '#li-',
    'follow us on linkedin',
    'follow us on twitter',
    // Generic marketing closers (Smartsheet) — handle straight and smart quotes
    'let\'s build what\'s next, together',
    'let\u2019s build what\u2019s next, together',
    'that\'s magic at work',
    'that\u2019s magic at work',
    'get to know us',
    // Website nav footer (mthree scrape)
    'terms & conditions',
    'terms &amp; conditions',
    '\u00a9 2026 mthree',
    '\u00a9 2025 mthree',
    'linkedin\ninstagram',
    'view jobs\ncontact',
    // Full nav-page detection (mthree atsText is pure site nav)
    'solutions\ncareers',
    'solutions\r\ncareers',
];

// These are only stripped when found in bottom 40% or past 1000 chars
// (they can legitimately appear in intros or role context earlier in the text)
const BOTTOM_ONLY_TRIGGERS: string[] = [
    'equal opportunity employer',
    'equal employment opportunity',
    'proud to foster a workplace free from discrimination',
    'we do not discriminate',
    'commitment to diversity',
    'we are an equal',
    'eeo statement',
    'affirmative action',
    'reasonable accommodation',
    'if you need assistance',
    'individuals with disabilities',
    'applicants will receive consideration',
    'job applicant privacy notice',
    'applicant privacy notice',
    'california consumer privacy act',
    'ccpa',
    'privacy policy',
    'by a number of factors, including, but not limited to, the applicant\'s experience',
    'internal team benchmarks',
];

let CDN_BOILERPLATE_REGISTRY: Record<string, string[]> = {};

export function setBoilerplateRegistry(registry: Record<string, string[]>) {
    CDN_BOILERPLATE_REGISTRY = registry;
}

export function stripBoilerplate(text: string, companyName?: string): string {
    if (!text) return '';
    let lowerText = text.toLowerCase();
    let earliestCutoff = text.length;

    const applyTrigger = (trigger: string, bottomOnly: boolean) => {
        const idx = lowerText.indexOf(trigger.toLowerCase());
        if (idx === -1) return;
        // bottomOnly: only cut if in the bottom 40% or past 1000 chars
        if (bottomOnly && !(idx > text.length * 0.6 || idx > 1000)) return;
        // Snap back to the start of the paragraph/line
        const lastNewline = text.lastIndexOf('\n', idx);
        const cutoff = lastNewline !== -1 ? lastNewline : idx;
        if (cutoff < earliestCutoff) earliestCutoff = cutoff;
    };

    for (const trigger of ALWAYS_STRIP_TRIGGERS) applyTrigger(trigger, false);
    for (const trigger of BOTTOM_ONLY_TRIGGERS) applyTrigger(trigger, true);

    if (companyName) {
        const companyKey = companyName.toLowerCase().trim();
        const customTriggers = CDN_BOILERPLATE_REGISTRY[companyKey];
        if (customTriggers && Array.isArray(customTriggers)) {
            for (const trigger of customTriggers) {
                applyTrigger(trigger, false); // Treat company boilerplate as ALWAYS_STRIP
            }
        }
    }

    let result = text.substring(0, earliestCutoff).trim();
    result = result.replace(/\*+\s*$/g, '').trim();
    return result;
}



function decodeHtmlEntities(str: string): string {
    if (!str) return '';
    return str
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&');
}

/**
 * Filter locations to remove department/office names that aren't real cities/regions.
 * Exported so ats-native.ts can use it when building the locations array.
 */
export function filterRealLocations(locations: string[]): string[] {
    return locations.filter(isRealLocation);
}

/**
 * Splits Greenhouse job description HTML into logical sections based on bold headers/p tags.
 * Maps them to our canonical templates.md headers.
 * 
 * Key behaviour:
 * - The "About the Company" section is intentionally EXCLUDED from the output description.
 *   Students only need role-specific content (Role, Responsibilities, Requirements, Benefits).
 * - Office/department names are filtered from locations.
 * - Soft skills are excluded from requiredSkills.
 */
export function parseGreenhouseHtml(rawHtml: string, companyName?: string): ParsedGreenhouseData {
    const requiredSkills: string[] = [];
    const allowedDegreesSet = new Set<string>();
    const allowedCoursesSet = new Set<string>();
    let experienceMin: number | undefined;
    let experienceMax: number | undefined;
    let incentives = '';
    let selectionProcess = '';
    let workplaceType: 'ONSITE' | 'HYBRID' | 'REMOTE' | null = null;

    if (!rawHtml) {
        return { description: '', requiredSkills: [], allowedDegrees: [], allowedCourses: [] };
    }

    const html = decodeHtmlEntities(rawHtml);

    // Check workplace type in raw text
    const lowerHtml = html.toLowerCase();
    if (lowerHtml.includes('remote') || lowerHtml.includes('work from home') || lowerHtml.includes('wfh')) {
        workplaceType = 'REMOTE';
    } else if (lowerHtml.includes('hybrid')) {
        workplaceType = 'HYBRID';
    } else if (lowerHtml.includes('onsite') || lowerHtml.includes('on-site') || lowerHtml.includes('in-office') || lowerHtml.includes('in office')) {
        workplaceType = 'ONSITE';
    }

    // Convert standalone bold paragraphs to h2 so they act as section headers.
    // Only match <p><strong>Header Text</strong></p> — not inline bold within sentences.
    let workingHtml = html.replace(/<p(?:[^>]*)>\s*<(?:strong|b)>([^<]+)<\/(?:strong|b)>\s*<\/p>/gi, '<h2>$1</h2>');

    // Split by heading tags. Use a regex that captures the full <hN ...>...</hN> block.
    // Strategy: find all heading+content pairs by matching h-tags in sequence.
    const sectionPattern = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>([\s\S]*?)(?=<h[1-6]|$)/gi;
    const parsedSections: string[] = [];

    let match: RegExpExecArray | null;
    let hasFoundContent = false;

    while ((match = sectionPattern.exec(workingHtml)) !== null) {
        const rawHeaderHtml = match[1];
        const contentHtml = match[2].trim();

        const headerText = rawHeaderHtml.replace(/<[^>]+>/g, '').trim();
        const cleanHeader = headerText.toLowerCase();

        if (!headerText || !contentHtml) continue;

        // (Disabled: Now we extract company sections instead of stripping them via Boilerplate registry)
        /*
        if (/about (the )?company|about us|who (we|are)|about [a-z0-9\-\s]+/i.test(cleanHeader) && !/about the role/i.test(cleanHeader)) {
            continue;
        }
        */

        const cleanedContent = cleanHtmlToMarkdown(contentHtml);
        if (!cleanedContent || cleanedContent.length < 20) continue;

        hasFoundContent = true;

        // Map raw headers to canonical headers
        let canonicalHeader = headerText;
        if (/about the role|the opportunity|role entails|overview/i.test(cleanHeader)) {
            canonicalHeader = 'About the Role';
        } else if (/what you.ll do|what you will do|key responsibilities|responsibilities|your role/i.test(cleanHeader)) {
            canonicalHeader = 'Responsibilities';
        } else if (/what we.re looking for|what we are looking for|requirements|qualifications|who you are|skills.*experience|nice.to.have|preferred|what you.ll bring|what you will bring/i.test(cleanHeader)) {
            canonicalHeader = 'Requirements';

            // Extract skills, degrees, experience from Requirements list items
            const listItems = contentHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
            for (const item of listItems) {
                const itemText = item.replace(/<[^>]+>/g, '').toLowerCase().trim();

                // Experience
                const rangeMatch = itemText.match(/\b([0-9]+)\s*(?:-|to)\s*([0-9]+)\s*years?\b/i);
                if (rangeMatch) {
                    const mn = parseInt(rangeMatch[1], 10);
                    const mx = parseInt(rangeMatch[2], 10);
                    if (!isNaN(mn)) experienceMin = experienceMin !== undefined ? Math.min(experienceMin, mn) : mn;
                    if (!isNaN(mx)) experienceMax = experienceMax !== undefined ? Math.max(experienceMax, mx) : mx;
                } else {
                    const plusMatch = itemText.match(/\b([0-9]+)\+\s*years?\b/i);
                    if (plusMatch) {
                        const mn = parseInt(plusMatch[1], 10);
                        if (!isNaN(mn)) experienceMin = experienceMin !== undefined ? Math.min(experienceMin, mn) : mn;
                    }
                }

                // Degree
                if (itemText.includes('degree') || itemText.includes('bachelor') || itemText.includes('graduate')) allowedDegreesSet.add('DEGREE');
                if (itemText.includes('master') || itemText.includes('postgraduate') || itemText.includes('pg')) allowedDegreesSet.add('PG');
                if (itemText.includes('diploma')) allowedDegreesSet.add('DIPLOMA');

                // Course
                for (const course of ['b.tech', 'btech', 'b.e', 'be', 'mca', 'bca', 'm.tech', 'mtech', 'b.sc', 'bsc']) {
                    if (new RegExp(`\\b${course.replace('.', '\\.')}\\b`, 'i').test(itemText)) {
                        allowedCoursesSet.add(course.toUpperCase().replace('.', ''));
                    }
                }
                if (itemText.includes('computer science')) allowedCoursesSet.add('Computer Science');
                if (itemText.includes('engineering')) allowedCoursesSet.add('Engineering');

                // Skills
                if (SOFT_SKILL_BLOCKLIST.has(itemText)) continue;
                for (const [lowerSkill, canonicalSkill] of CANONICAL_SKILLS_MAP.entries()) {
                    if (SOFT_SKILL_BLOCKLIST.has(lowerSkill)) continue;
                    const escaped = lowerSkill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    if (new RegExp(`(?:^|[^a-zA-Z0-9+#.])(${escaped})(?:$|[^a-zA-Z0-9+#.])`, 'i').test(itemText)) {
                        if (!requiredSkills.includes(canonicalSkill)) requiredSkills.push(canonicalSkill);
                    }
                }
            }
        } else if (/benefits|perks|what we offer|compensation/i.test(cleanHeader)) {
            canonicalHeader = 'Benefits';
            const benefitItems = contentHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
            incentives = benefitItems
                .map(li => li.replace(/<[^>]+>/g, '').trim())
                .filter(t => t.length > 2)
                .slice(0, 5)
                .join(' · ');
        } else if (/interview|hiring process|selection|application process|how we hire/i.test(cleanHeader)) {
            canonicalHeader = 'Interview Process';
            // Also capture as selectionProcess field
            const processItems = contentHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
            if (processItems.length > 0) {
                selectionProcess = processItems
                    .map(li => li.replace(/<[^>]+>/g, '').trim())
                    .filter(t => t.length > 2)
                    .join('\n');
            } else {
                selectionProcess = cleanedContent;
            }
        }

        parsedSections.push(`**${canonicalHeader}**\n${cleanedContent}`);
    }

    // If no sections matched (job uses no headers at all), fall back to full cleaned text
    if (!hasFoundContent) {
        const fullText = stripBoilerplate(cleanHtmlToMarkdown(workingHtml), companyName);
        return {
            description: fullText,
            requiredSkills: [],
            allowedDegrees: Array.from(allowedDegreesSet),
            allowedCourses: Array.from(allowedCoursesSet),
            selectionProcess,
            incentives,
            workplaceType
        };
    }

    return {
        description: stripBoilerplate(parsedSections.join('\n\n'), companyName) || parsedSections.join('\n\n'),
        requiredSkills: Array.from(new Set(requiredSkills)),
        allowedDegrees: Array.from(allowedDegreesSet),
        allowedCourses: Array.from(allowedCoursesSet),
        experienceMin,
        experienceMax,
        incentives,
        selectionProcess,
        workplaceType
    };
}

