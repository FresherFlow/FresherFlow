import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const CDN_BASE_URL = (process.env.NEXT_PUBLIC_CDN_URL || process.env.CDN_URL as string).replace(/\/$/, '');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface Company {
    name: string;
    url?: string;
    logo_url?: string;
    slug?: string;
}

export interface EducationData {
    educationLevels: string[];
    courses: Record<string, string[]>;
    specializations: Record<string, string[]>;
}

// Global cached memory states
export const CANONICAL_COMPANIES = new Map<string, Company>();
export const CANONICAL_SKILLS = new Set<string>();
export const CANONICAL_SKILLS_MAP = new Map<string, string>(); // lowercase -> original
export const CANONICAL_CITIES = new Set<string>();
export const CANONICAL_CITIES_MAP = new Map<string, string>(); // lowercase -> original (all cities)
export const INDIAN_CITIES_MAP = new Map<string, string>();     // lowercase -> canonical (India only)
export const INTERNATIONAL_CITIES_MAP = new Map<string, string>(); // lowercase -> canonical (International)
export const INDIAN_STATES_SET = new Set<string>();             // lowercase state names
// slug -> company name (e.g. 'mthreerecruitingportal' -> 'mthree')
export const GREENHOUSE_SLUG_MAP = new Map<string, string>(); // boardSlug -> companyName
// reverse: companyName (lowercase) -> boardSlug
export const GREENHOUSE_COMPANY_TO_SLUG = new Map<string, string>();

export let CANONICAL_EDUCATION: EducationData = {
    educationLevels: ['DIPLOMA', 'DEGREE', 'PG'],
    courses: {},
    specializations: {}
};

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function getCacheDir(): Promise<string> {
    const cwd = process.cwd();
    if (await fileExists(path.join(cwd, 'pnpm-workspace.yaml'))) {
        return path.join(cwd, 'docs/.cache/metadata');
    }
    if (await fileExists(path.join(cwd, '../../pnpm-workspace.yaml'))) {
        return path.join(cwd, '../../docs/.cache/metadata');
    }
    if (await fileExists(path.join(cwd, '../pnpm-workspace.yaml'))) {
        return path.join(cwd, '../docs/.cache/metadata');
    }
    return path.join(cwd, 'docs/.cache/metadata');
}

async function fetchWithCache(filename: string): Promise<string | null> {
    const cacheDir = await getCacheDir();
    const cacheFile = path.join(cacheDir, filename);

    await fs.mkdir(path.dirname(cacheFile), { recursive: true });

    let useCache = false;
    if (await fileExists(cacheFile)) {
        try {
            const stat = await fs.stat(cacheFile);
            const age = Date.now() - stat.mtimeMs;
            if (age < CACHE_TTL_MS) {
                useCache = true;
            }
        } catch {
            // Ignore error, force fetch
        }
    }

    if (useCache) {
        try {
            const content = await fs.readFile(cacheFile, 'utf8');
            if (content && content.trim().length > 0) {
                return content;
            }
        } catch {
            // Fallback to fetch
        }
    }

    // Fetch from CDN
    const url = `${CDN_BASE_URL}/${filename}`;
    console.log(`Downloading metadata from CDN: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Status ${response.status}: ${response.statusText}`);
        }
        const text = await response.text();
        await fs.writeFile(cacheFile, text, 'utf8');
        return text;
    } catch (err) {
        console.warn(`Failed to fetch ${filename} from CDN: ${(err as Error).message}.`);
        // Fallback to expired cache if available
        if (await fileExists(cacheFile)) {
            console.log(`Using expired cache fallback for ${filename}`);
            return fs.readFile(cacheFile, 'utf8').catch(() => null);
        }
        return null;
    }
}

export async function loadCdnMetadata(): Promise<void> {
    console.log("Initializing CDN Metadata loader...");

    // 1. Companies
    const companiesJson = await fetchWithCache('companies.json');
    if (companiesJson) {
        try {
            const companiesList = JSON.parse(companiesJson) as Company[];
            for (const c of companiesList) {
                if (c.name) {
                    CANONICAL_COMPANIES.set(c.name.toLowerCase().trim(), c);
                }
            }
            console.log(`Loaded ${CANONICAL_COMPANIES.size} canonical companies.`);
        } catch (err) {
            console.error("Failed to parse companies.json:", err);
        }
    }

    // 2. Skills
    const skillsJson = await fetchWithCache('skills.json');
    if (skillsJson) {
        try {
            const skillsList = JSON.parse(skillsJson) as string[];
            for (const s of skillsList) {
                if (s) {
                    const trimmed = s.trim();
                    const lower = trimmed.toLowerCase();
                    CANONICAL_SKILLS.add(lower);
                    CANONICAL_SKILLS_MAP.set(lower, trimmed);
                }
            }
            console.log(`Loaded ${CANONICAL_SKILLS.size} canonical skills.`);
        } catch (err) {
            console.error("Failed to parse skills.json:", err);
        }
    }

    // 3. Cities
    const citiesJson = await fetchWithCache('cities.json');
    if (citiesJson) {
        try {
            const citiesMap = JSON.parse(citiesJson) as Record<string, string[]>;
            const INTERNATIONAL_GROUP = 'International';
            for (const state of Object.keys(citiesMap)) {
                const stateCities = citiesMap[state] || [];
                const isInternational = state === INTERNATIONAL_GROUP;
                if (!isInternational) INDIAN_STATES_SET.add(state.toLowerCase());
                for (const c of stateCities) {
                    if (c) {
                        const trimmed = c.trim();
                        const lower = trimmed.toLowerCase();
                        CANONICAL_CITIES.add(lower);
                        CANONICAL_CITIES_MAP.set(lower, trimmed);
                        if (isInternational) {
                            INTERNATIONAL_CITIES_MAP.set(lower, trimmed);
                        } else {
                            INDIAN_CITIES_MAP.set(lower, trimmed);
                        }
                    }
                }
            }
            console.log(`Loaded ${INDIAN_CITIES_MAP.size} Indian cities, ${INTERNATIONAL_CITIES_MAP.size} international cities.`);
        } catch (err) {
            console.error("Failed to parse cities.json:", err);
        }
    }

    // 4. Education
    const educationJson = await fetchWithCache('education.json');
    if (educationJson) {
        try {
            CANONICAL_EDUCATION = JSON.parse(educationJson) as EducationData;
            console.log("Loaded canonical education data.");
        } catch (err) {
            console.error("Failed to parse education.json:", err);
        }
    }

    // 5. ATS Greenhouse slugs (ats/greenhouse.json → { boardSlug: companyName })
    const greenhouseJson = await fetchWithCache('ats/greenhouse.json');
    if (greenhouseJson) {
        try {
            const slugMap = JSON.parse(greenhouseJson) as Record<string, string>;
            for (const [slug, company] of Object.entries(slugMap)) {
                GREENHOUSE_SLUG_MAP.set(slug.toLowerCase(), company);
                GREENHOUSE_COMPANY_TO_SLUG.set(company.toLowerCase().trim(), slug);
            }
            console.log(`Loaded ${GREENHOUSE_SLUG_MAP.size} Greenhouse board slugs.`);
        } catch (err) {
            console.error('Failed to parse ats/greenhouse.json:', err);
        }
    }
}
