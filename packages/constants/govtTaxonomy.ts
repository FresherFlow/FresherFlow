/**
 * Government Job Reference Data
 * Single source of truth for all govt-specific taxonomy.
 * Used by: API (_helpers.ts), Web (dropdowns/filters), Mobile (filter chips)
 */

import { EducationLevel } from '@fresherflow/types';

// ── Exam Categories ──────────────────────────────────────────────────────────

export const GOVT_EXAM_CATEGORIES = {
    SSC:      'Staff Selection Commission',
    UPSC:     'Union Public Service Commission',
    RAILWAYS: 'Indian Railways',
    BANKING:  'Banking / PSU',
    POLICE:   'Police / Paramilitary',
    DEFENCE:  'Defence / Armed Forces',
    STATE:    'State Government',
    PSU:      'Public Sector Undertaking',
    JUDICIARY: 'Judiciary / Law',
    TEACHING: 'Teaching / Education',
} as const;

export type GovtExamCategory = keyof typeof GOVT_EXAM_CATEGORIES;

// ── Known Recruiting Bodies (for autocomplete + deduplication) ────────────────

export const KNOWN_RECRUITING_BODIES = [
    // Central
    'Staff Selection Commission',
    'UPSC', 'IBPS', 'SBI', 'RBI', 'LIC', 'NPS Trust',
    'RRB', 'RRC', 'Indian Railways',
    'DRDO', 'ISRO', 'HAL', 'BEL', 'BHEL', 'ONGC', 'NTPC', 'GAIL',
    'Indian Army', 'Indian Navy', 'Indian Air Force', 'Indian Coast Guard',
    'CRPF', 'BSF', 'CISF', 'ITBP', 'SSB', 'NSG',
    // State
    'TSLPRB', 'TSPSC',   // Telangana
    'KPSC', 'KSRP',      // Karnataka
    'TNPSC', 'MRB',      // Tamil Nadu
    'APPSC', 'SLPRB',    // Andhra Pradesh
    'MPPSC', 'MPESB',    // Madhya Pradesh
    'BPSC', 'BSSC',      // Bihar
    'UPPSC', 'UPPRPB',   // Uttar Pradesh
    'RPSC', 'RSMSSB',    // Rajasthan
    'GPSC', 'OJAS',      // Gujarat
    'MPSC',              // Maharashtra
    'JPSC', 'JSSC',      // Jharkhand
    'UKPSC', 'UKSSSC',   // Uttarakhand
] as const;

// ── Application Status Labels ─────────────────────────────────────────────────

export const GOVT_APPLICATION_STATUS_LABELS: Record<string, string> = {
    UPCOMING:   'Upcoming',
    OPEN:       'Apply Now',
    CLOSED:     'Closed',
    RESULT_OUT: 'Result Out',
};

export const GOVT_APPLICATION_STATUS_COLORS: Record<string, string> = {
    UPCOMING:   '#F59E0B', // amber
    OPEN:       '#10B981', // green
    CLOSED:     '#6B7280', // gray
    RESULT_OUT: '#3B82F6', // blue
};

// ── Qualification → EducationLevel Mapping ────────────────────────────────────
// Single source of truth — imported by API, Web and Mobile
// Order matters: more specific patterns first

export interface QualificationPattern {
    pattern: RegExp;
    level: EducationLevel;
    label: string; // human-readable display
}

export const QUALIFICATION_PATTERNS: QualificationPattern[] = [
    {
        pattern: /\b(master|post.?graduate|m\.tech|mba|mca|m\.sc|m\.a|pg)\b/i,
        level: EducationLevel.PG,
        label: 'Post Graduate',
    },
    {
        pattern: /\bdiploma\b/i,
        level: EducationLevel.DIPLOMA,
        label: 'Diploma',
    },
    {
        pattern: /\b(bachelor|graduation|graduate|degree|b\.tech|b\.e|b\.sc|bca|bba|bcom|b\.a|llb|b\.ed|any\s+graduate)\b/i,
        level: EducationLevel.DEGREE,
        label: 'Graduate / Degree',
    },
    {
        pattern: /\b(12th|intermediate|hsc|10\+2|class\s*12|higher\s+secondary)\b/i,
        level: EducationLevel.DEGREE, // no TWELFTH bucket exists, DEGREE is safest
        label: '12th / Intermediate',
    },
    {
        pattern: /\b(10th|ssc|matriculation|class\s*10|secondary)\b/i,
        level: EducationLevel.DEGREE,
        label: '10th / SSC',
    },
];

/**
 * Extract EducationLevel[] from qualificationDetails JSON array.
 * Uses QUALIFICATION_PATTERNS — the single source of truth.
 */
export function extractDegreesFromQualifications(qualificationDetails: unknown[]): EducationLevel[] {
    const degrees = new Set<EducationLevel>();
    for (const q of qualificationDetails ?? []) {
        const qRecord = q as Record<string, unknown>;
        const text = String(qRecord?.qualification || qRecord?.requirement || qRecord?.eligibility || '');
        for (const { pattern, level } of QUALIFICATION_PATTERNS) {
            if (pattern.test(text)) {
                degrees.add(level);
                break; // first match wins (most specific → least specific order)
            }
        }
    }
    return [...degrees];
}

// ── Location helpers ──────────────────────────────────────────────────────────

export const CENTRAL_GOVT_LEVELS = ['CENTRAL', 'RAILWAYS', 'DEFENCE', 'BANKING', 'PSU'] as const;

export function deriveGovtLocations(
    governmentLevel: string | undefined,
    examCenters: string[] | undefined,
    adminProvidedLocations: string[]
): string[] {
    if (adminProvidedLocations.length > 0) return adminProvidedLocations;
    if (!governmentLevel) return ['All India'];
    if ((CENTRAL_GOVT_LEVELS as readonly string[]).includes(governmentLevel)) return ['All India'];
    // State-level: examCenters may give us cities, but location = state name
    // For now fall back to All India until state mapping is added
    return ['All India'];
}
