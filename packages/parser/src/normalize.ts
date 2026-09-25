/**
 * Normalization functions — convert raw strings into typed, structured values.
 * Now delegates to @fresherflow/utils to ensure consistency.
 */
import { 
    normalizeSalary as domainNormalizeSalary, 
    normalizeExpiry as domainNormalizeExpiry 
} from '@fresherflow/utils';
import { NormalizedSalary } from './types.js';
import { SalaryPeriod } from '@fresherflow/types';

/**
 * Normalize a salary string or extract structured salary from raw job text.
 */
export function normalizeSalary(text: string): NormalizedSalary {
    const result = domainNormalizeSalary(text);
    return {
        min: result.min,
        max: result.max,
        period: result.period as unknown as SalaryPeriod,
        range: result.range,
    };
}

/**
 * Extract and normalize an application deadline date from raw job text.
 */
export function normalizeExpiry(text: string): string | undefined {
    return domainNormalizeExpiry(text);
}

/* ────────────────────────────────────────────────────────────────────── *
 *  Common pre-processing
 * ────────────────────────────────────────────────────────────────────── */

const NBSP_RE = /[   ]/g;
const COMBINING_MARKS_RE = /\p{M}/gu;
const MULTI_WS_RE = /\s+/g;

/**
 * Lower-cases + strips diacritics + collapses whitespace. Used as the base
 * for all three normalisers. Don't export — callers should use the typed
 * `normalizeCompany`/`normalizeTitle`/`normalizeLocation` wrappers.
 */
function baseNormalize(input: string): string {
  return input
    .normalize('NFKD')
    .replace(COMBINING_MARKS_RE, '')
    .replace(NBSP_RE, ' ')
    .replace(MULTI_WS_RE, ' ')
    .trim()
    .toLowerCase();
}

/* ────────────────────────────────────────────────────────────────────── *
 *  Company
 * ────────────────────────────────────────────────────────────────────── */

/**
 * Suffixes that legally identify a company but never affect identity.
 * Order matters — multi-word suffixes must be removed first.
 */
const COMPANY_SUFFIXES: ReadonlyArray<RegExp> = [
  /\b(?:gesellschaft mit beschr[aä]nkter haftung)\b/g,
  /\b(?:public limited company)\b/g,
  /\b(?:limited liability company)\b/g,
  /\b(?:incorporated|incorporation)\b/g,
  /\b(?:corporation|corp\.?)\b/g,
  /\b(?:company|co\.?)\b/g,
  /\b(?:limited|ltd\.?)\b/g,
  /\b(?:l\.?l\.?c\.?)\b/g,
  /\b(?:p\.?l\.?c\.?)\b/g,
  /\b(?:gmbh|ag|kg|s\.?a\.?|s\.?l\.?|s\.?r\.?l\.?|sas|oy|ab|bv|nv)\b/g,
  /\b(?:pty\.?|pte\.?|inc\.?)\b/g,
  /\b(?:holdings?|group|technologies|technology|systems?|solutions?|services?|labs?|studios?)\b/g,
];

const PUNCT_RE = /[.,;:!?'`"‘’“”()\[\]{}<>]/g;

/**
 * Canonicalise a company name.
 *
 * Examples:
 *   "Acme, Inc."        → "acme"
 *   "ACME Corporation"  → "acme"
 *   "Some Co., Ltd."    → "some"
 *   "Müller GmbH"       → "muller"
 *   "OpenAI, L.L.C."    → "openai"
 */
export function normalizeCompany(input: string | null | undefined): string {
  if (!input) return '';
  let s = baseNormalize(input);
  // Strip suffixes BEFORE punctuation: patterns like `l\.?l\.?c\.?` rely on
  // the dots still being there.
  for (const re of COMPANY_SUFFIXES) {
    s = s.replace(re, ' ');
  }
  // Remove ampersand & "and" word forms — "Smith & Sons" === "Smith and Sons".
  s = s.replace(/\s+(?:&|and)\s+/g, ' ');
  // Now drop leftover punctuation.
  s = s.replace(PUNCT_RE, ' ');
  return s.replace(MULTI_WS_RE, ' ').trim();
}

/* ────────────────────────────────────────────────────────────────────── *
 *  Title
 * ────────────────────────────────────────────────────────────────────── */

const TITLE_SENIORITY_ALIASES: ReadonlyArray<[RegExp, string]> = [
  [/\bsr\.?\b/g, 'senior'],
  [/\bjr\.?\b/g, 'junior'],
  [/\bii\b/g, '2'],
  [/\biii\b/g, '3'],
  [/\biv\b/g, '4'],
  [/\bsoftware engineer\b/g, 'swe'],
  [/\bmachine learning\b/g, 'ml'],
  [/\bdata scientist\b/g, 'ds'],
  [/\bsite reliability engineer\b/g, 'sre'],
  [/\bproduct manager\b/g, 'pm'],
];

const TITLE_NOISE: ReadonlyArray<RegExp> = [
  // Parenthesised/bracketed extras: "(Remote)", "[NYC]", etc.
  /\([^)]*\)/g,
  /\[[^\]]*\]/g,
  // Trailing slashes/pipes: "Backend / Go", "Engineer | Remote"
  /[/|]/g,
];

/**
 * Canonicalise a job title.
 *
 * Examples:
 *   "Sr. Software Engineer"             → "senior swe"
 *   "Senior Software Engineer (Remote)" → "senior swe"
 *   "ML Engineer III"                   → "ml engineer 3"
 */
export function normalizeTitle(input: string | null | undefined): string {
  if (!input) return '';
  let s = baseNormalize(input);
  for (const re of TITLE_NOISE) s = s.replace(re, ' ');
  s = s.replace(PUNCT_RE, ' ');
  for (const [re, repl] of TITLE_SENIORITY_ALIASES) s = s.replace(re, repl);
  return s.replace(MULTI_WS_RE, ' ').trim();
}

/* ────────────────────────────────────────────────────────────────────── *
 *  Location
 * ────────────────────────────────────────────────────────────────────── */

const LOCATION_REMOTE_TOKENS = /\b(?:remote|work\s*from\s*home|wfh|anywhere|telecommute|virtual)\b/;
const LOCATION_DELIM_RE = /[,;]+/g;

/** Two-letter US-state abbreviations (kept lowercase for matching). */
const US_STATE_ABBR_TO_FULL: Readonly<Record<string, string>> = {
  al: 'alabama', ak: 'alaska', az: 'arizona', ar: 'arkansas', ca: 'california',
  co: 'colorado', ct: 'connecticut', de: 'delaware', fl: 'florida', ga: 'georgia',
  hi: 'hawaii', id: 'idaho', il: 'illinois', in: 'indiana', ia: 'iowa',
  ks: 'kansas', ky: 'kentucky', la: 'louisiana', me: 'maine', md: 'maryland',
  ma: 'massachusetts', mi: 'michigan', mn: 'minnesota', ms: 'mississippi',
  mo: 'missouri', mt: 'montana', ne: 'nebraska', nv: 'nevada', nh: 'new hampshire',
  nj: 'new jersey', nm: 'new mexico', ny: 'new york', nc: 'north carolina',
  nd: 'north dakota', oh: 'ohio', ok: 'oklahoma', or: 'oregon', pa: 'pennsylvania',
  ri: 'rhode island', sc: 'south carolina', sd: 'south dakota', tn: 'tennessee',
  tx: 'texas', ut: 'utah', vt: 'vermont', va: 'virginia', wa: 'washington',
  wv: 'west virginia', wi: 'wisconsin', wy: 'wyoming',
};

/**
 * Canonicalise a location string.
 *
 * Examples:
 *   "Remote, US"           → "remote"
 *   "San Francisco, CA"    → "san francisco california"
 *   "New York, NY, USA"    → "new york new york usa"
 *   "Anywhere"             → "remote"
 */
export function normalizeLocation(input: string | null | undefined): string {
  if (!input) return '';
  let s = baseNormalize(input);
  // If "remote" appears, surface it as a clean token; collapse rest.
  if (LOCATION_REMOTE_TOKENS.test(s) && !s.includes(' in ')) {
    return 'remote';
  }
  s = s.replace(LOCATION_DELIM_RE, ' ');
  s = s.replace(PUNCT_RE, ' ');
  // Expand US state abbreviations (`SF, CA` → `sf california`).
  s = s
    .split(' ')
    .map((tok) => US_STATE_ABBR_TO_FULL[tok] ?? tok)
    .join(' ');
  return s.replace(MULTI_WS_RE, ' ').trim();
}


/* ────────────────────────────────────────────────────────────────────── *
 *  Title Demuxing & Entity Extraction
 * ────────────────────────────────────────────────────────────────────── */

export interface DemuxedTitleResult {
  title: string;
  company?: string;
  location?: string;
}

/**
 * Deterministically demuxes job titles polluted with company, location, or site suffixes.
 */
export function demuxJobTitle(raw: string | null | undefined): DemuxedTitleResult {
  if (!raw) return { title: '' };
  let title = raw.replace(/[\u2013\u2014]/g, '-').trim();
  let company: string | undefined;
  let location: string | undefined;

  // 1. Strip ' - Job ID: ...' or Job Id at end
  title = title.replace(/\s*[-|]\s*(?:Job\s*ID|Req\s*ID|Requisition\s*ID|ID)[:\s]+[A-Za-z0-9_-]+/i, '');

  // 2. Strip ' - Company Career Site' or ' - Career Site'
  const careerSiteMatch = title.match(/\s*-\s*([A-Za-z0-9\s&]+)\s+Career\s+Site\s*$/i);
  if (careerSiteMatch) {
    if (!company) company = careerSiteMatch[1].trim();
    title = title.replace(/\s*-\s*[A-Za-z0-9\s&]+\s+Career\s+Site\s*$/i, '');
  }
  title = title.replace(/\s*[-|]\s*(?:(?:External\s*)?Career\s*Site|Careers|Job\s*Details?|Careers\s*Marketplace|Screenloop)\b.*$/i, '');

  // 3. Pattern: '<Company> hiring <Title> [in <Location>]'
  const hiringMatch = title.match(/^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+([A-Za-z0-9\s,-]+))?$/i);
  if (hiringMatch) {
    if (!company) company = hiringMatch[1].trim();
    title = hiringMatch[2].trim();
    if (hiringMatch[3] && !location) location = hiringMatch[3].trim();
  }

  // 4. Pattern: '<Title> at <Company> [- <Location>]'
  const atMatch = title.match(/^(.+?)\s+at\s+([^•|-]+)(?:[•|-]\s*(.+))?$/i);
  if (atMatch) {
    let role = atMatch[1].trim();
    if (!company) company = atMatch[2].trim();
    if (atMatch[3] && !location) location = atMatch[3].split(/[•|]/)[0].trim();
    const roleInMatch = role.match(/^(.+?)\s+(?:Job\s+)?in\s+([A-Za-z\s]+)$/i);
    if (roleInMatch) {
      role = roleInMatch[1].trim();
      if (!location) location = roleInMatch[2].trim();
    }
    title = role;
  }

  // 5. Pattern: '<Title> @ <Company>'
  const atSignMatch = title.match(/^(.+?)\s+@\s+([A-Za-z0-9\s&.,-]+)$/);
  if (atSignMatch) {
    title = atSignMatch[1].trim();
    if (!company) company = atSignMatch[2].trim();
  }

  // 6. Pattern: 'Hiring <Title> [in <Location>]- <Company>'
  const hiringPrefix = title.match(/^Hiring\s+(.+?)(?:\s+in\s+([A-Za-z\s]+))?\s*[-–]\s*(.+)$/i);
  if (hiringPrefix) {
    title = hiringPrefix[1].trim();
    if (hiringPrefix[2] && !location) location = hiringPrefix[2].trim();
    if (hiringPrefix[3] && !company) company = hiringPrefix[3].trim();
  }

  // 7. Pattern: '<Title> in <Location>'
  const inLocMatch = title.match(/^(.+?)\s+in\s+([A-Za-z\u00C0-\u024F\s,\d-]+)$/i);
  if (inLocMatch) {
    const locPart = inLocMatch[2].trim();
    if (/\b(India|Bangalore|Bengaluru|Gurgaon|Gurugram|Noida|Hyderabad|Pune|Mumbai|Chennai|Delhi|Karn[a-z\u00C0-\u024F]+|United States|Patan|Gujarat|Maharashtra|Telangana)\b/i.test(locPart)) {
      title = inLocMatch[1].trim();
      if (!location) location = locPart;
    }
  }

  // 8. Strip bullet points or remaining site markers
  if (title.includes('•') || title.includes('|')) {
    title = title.split(/[•|]/)[0].trim();
  }

  // 9. Strip trailing ' - <CompanySuffix>' (e.g. ' - Datavail', ' - Nokia', ' - Zycus', ' - Heizen')
  const knownSuffixMatch = title.match(/\s*-\s*([A-Za-z0-9\s&]+)\s*$/);
  if (knownSuffixMatch) {
    const candidate = knownSuffixMatch[1].trim();
    if (/^(Datavail|Nokia|Zycus|Heizen|Citadel Securities|Icertis|Screenloop|Emerson|AryaXAI|Cohere|Infosys|Wipro|Amazon)$/i.test(candidate)) {
      if (!company) company = candidate;
      title = title.slice(0, title.lastIndexOf('-')).trim();
    }
  }


  // 10. Strip 'Job for Freshers', 'Job Details'
  title = title.replace(/\s+job\s+for\s+Freshers\b.*$/i, '');
  title = title.replace(/\s+Job\s*Details?\b.*$/i, '');
  // Whole-title generic forms: "Job Details", "Careers", "Jobs"
  if (/^(?:job\s*details?|careers?|jobs?|job openings?|open positions?)$/i.test(title.trim())) {
    title = '';
  }

  return { title: title.trim(), company, location };
}

/**
 * Deterministically infers company name from known URL domains.
 */
export function extractCompanyFromUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes('microsoft.com')) return 'Microsoft';
    if (host.includes('amazon.jobs') || host.includes('amazon.com')) return 'Amazon';
    if (host.includes('wipro.com')) return 'Wipro';
    if (host.includes('capgemini.com')) return 'Capgemini';
    if (host.includes('gehealthcare.com')) return 'GE HealthCare';
    if (host.includes('hsbc.com')) return 'HSBC';
    if (host.includes('citi.com')) return 'Citi';
    if (host.includes('hcltech.com')) return 'HCLTech';
    if (host.includes('deloitte.com')) return 'Deloitte';
    if (host.includes('siemens-energy.com') || host.includes('siemens.com')) return 'Siemens';
    if (host.includes('qualcomm.com')) return 'Qualcomm';
    if (host.includes('globallogic.com')) return 'GlobalLogic';
    if (host.includes('iqvia.com')) return 'IQVIA';
    if (host.includes('ea.com')) return 'Electronic Arts';
    if (host.includes('spglobal.com')) return 'S&P Global';
    if (host.includes('united.com')) return 'United Airlines';
    if (host.includes('google.com')) return 'Google';
    if (host.includes('myworkdayjobs.com')) {
      const subdomain = host.split('.')[0];
      if (subdomain && !subdomain.startsWith('wd')) {
        return subdomain.charAt(0).toUpperCase() + subdomain.slice(1);
      }
    }
  } catch {}
  return undefined;
}
