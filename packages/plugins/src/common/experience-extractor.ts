/**
 * Experience extraction utility.
 * Ported from ats-scrapers/extract_salary_experience.py
 */

export interface ExperienceResult {
  /** Minimum years of experience, or null if not found */
  minYears: number | null;
  /** Maximum years of experience, or null if not a range */
  maxYears: number | null;
  /** The matched text snippet for debugging */
  context: string | null;
}

/**
 * Patterns to match experience requirements in job descriptions.
 * Ordered by specificity (more specific patterns first).
 */
const EXPERIENCE_PATTERNS: RegExp[] = [
  // "5+ years" or "5+ yrs"
  /(\d{1,2})\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:relevant\s+|professional\s+|work\s+|hands[- ]on\s+)?experience/gi,
  // "3-5 years of experience"
  /(\d{1,2})\s*[-–—to]+\s*(\d{1,2})\s*(?:years?|yrs?)(?:\s+of)?\s+(?:relevant\s+|professional\s+|work\s+|hands[- ]on\s+)?experience/gi,
  // "minimum 3 years" or "at least 3 years"
  /(?:minimum|at\s+least|min\.?)\s*(\d{1,2})\s*(?:years?|yrs?)/gi,
  // "experience: 3+ years"
  /experience\s*[:]\s*(\d{1,2})\+?\s*(?:years?|yrs?)/gi,
  // "X years of experience" (standalone)
  /(\d{1,2})\s*(?:years?|yrs?)\s+(?:of\s+)?(?:relevant\s+|professional\s+|work\s+|industry\s+)?experience/gi,
];

/**
 * Context phrases that indicate the experience mention is NOT a requirement
 * (e.g., company history or benefits).
 */
const FALSE_POSITIVE_CONTEXTS = [
  /\d+\s*years?\s+(?:in\s+(?:business|operation|the\s+industry))/i,
  /(?:over|more\s+than)\s+\d+\s*years?\s+(?:of\s+)?(?:history|growth|success)/i,
  /company\s+(?:has|with)\s+\d+\s*years?/i,
];

/**
 * Extract experience requirements from a job description.
 * Returns the first match found, preferring ranged matches.
 */
export function extractExperience(description: string): ExperienceResult {
  if (!description) {
    return { minYears: null, maxYears: null, context: null };
  }

  // Try range patterns first (e.g. "3-5 years")
  const rangePattern = /(\d{1,2})\s*[-–—to]+\s*(\d{1,2})\s*(?:years?|yrs?)(?:\s+of)?\s+(?:relevant\s+|professional\s+|work\s+|hands[- ]on\s+)?experience/gi;
  let match = rangePattern.exec(description);
  if (match) {
    const context = match[0];
    if (!isFalsePositive(description, match.index)) {
      const min = parseInt(match[1], 10);
      const max = parseInt(match[2], 10);
      if (min <= 30 && max <= 30 && min <= max) {
        return { minYears: min, maxYears: max, context };
      }
    }
  }

  // Try single-value patterns
  for (const pattern of EXPERIENCE_PATTERNS) {
    pattern.lastIndex = 0; // Reset regex state
    match = pattern.exec(description);
    if (match) {
      const context = match[0];
      if (!isFalsePositive(description, match.index)) {
        const years = parseInt(match[1], 10);
        if (years <= 30) {
          return { minYears: years, maxYears: null, context };
        }
      }
    }
  }

  return { minYears: null, maxYears: null, context: null };
}

/**
 * Check if the match at the given position is likely a false positive.
 */
function isFalsePositive(text: string, matchIndex: number): boolean {
  // Extract a window of text around the match for context analysis
  const start = Math.max(0, matchIndex - 80);
  const end = Math.min(text.length, matchIndex + 80);
  const window = text.substring(start, end);

  return FALSE_POSITIVE_CONTEXTS.some((pattern) => pattern.test(window));
}
