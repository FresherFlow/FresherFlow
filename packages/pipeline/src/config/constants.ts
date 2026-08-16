/**
 * Shared constants for job-processor internal use.
 * Extracted here to avoid duplication between cdn-matcher.ts and greenhouse-parser.ts.
 */

/**
 * Soft skills and generic words that should never be stored as technical/required skills.
 * Checked in both cdn-matcher (CDN skill scan) and greenhouse-parser (section-level skill scan).
 */
export const SOFT_SKILL_BLOCKLIST = new Set([
    // Soft skills
    'english', 'fluent', 'communication', 'communication skills', 'written communication',
    'verbal communication', 'written and verbal communication', 'presentation skills',
    'interpersonal skills', 'teamwork', 'team player', 'problem solving', 'problem-solving',
    'critical thinking', 'attention to detail', 'time management', 'multitasking',
    'self-motivated', 'proactive', 'ownership', 'leadership', 'collaboration',
    'adaptability', 'organization', 'organizational skills', 'analytical skills',
    'analytical', 'creativity', 'innovation', 'drive', 'motivation',
    'fast learner', 'quick learner', 'coachable', 'detail-oriented', 'detail oriented',
    'growth mindset', 'result-oriented', 'results-oriented',
    // Domain-generic single words that match too broadly
    'insurance', 'engineering', 'sales', 'finance', 'accounting', 'marketing',
    'operations', 'documentation', 'technology', 'management', 'strategy',
    'reporting', 'compliance', 'governance', 'audit', 'research',
    // Generic action/trait words that exist in CDN but hit false positives in narrative text
    'can', 'confidence', 'editing', 'flexibility', 'scheduling', 'switching',
    'exchange', 'coordination', 'production', 'training', 'testing',
    'analysis', 'analytics', 'planning', 'delivery', 'execution',
]);
