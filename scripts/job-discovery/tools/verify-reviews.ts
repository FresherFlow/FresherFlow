/**
 * verify-reviews.ts
 *
 * Second-pass verifier running INSIDE the job-discovery workflow,
 * right after the main scraper produces review_jobs.json.
 *
 * The main scraper no longer captures aggregatorText.
 * We re-analyze the title.
 *
 * Outcomes:
 *   - Confirmed fresher  → promoted into discovered_jobs.json
 *   - Confirmed senior   → discarded (drop silently)
 *   - Still ambiguous    → stays in review_jobs.json unchanged
 */

import fs from 'node:fs/promises';
import path from 'node:path';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiscoveredJob {
    title: string;
    applyLink: string;
    source: string;
    discoveredAt: string;
    reviewRequired?: boolean;
    aggregatorUrl?: string;
    aggregatorTitle?: string;
}

interface JobsFile {
    version: number;
    source: string;
    jobs: DiscoveredJob[];
}

// ─── Phrase lists (mirrors index.ts exactly) ──────────────────────────────────

const FRESHER_PHRASES = [
    "0 years", "0 year", "fresher", "freshers", "experience: 0",
    "entry level", "entry-level", "intern", "internship", "graduate",
    "graduate engineer", "graduate trainee", "trainee", "associate", "junior",
    "campus hiring", "off campus", "software engineer i", "sde 1",
    "analyst", "business analyst", "data analyst", "apprentice"
];

const EXPERIENCED_PHRASES = [
    "1.5+ years", "1.5 years", "18+ months", "12+ months", "24+ months",
    "12 months", "18 months", "24 months", "1 year of exp", "1 year exp",
    "1+ exp", "2+ exp", "3+ exp", "4+ exp", "5+ exp", "6+ exp", "7+ exp",
    "8+ exp", "10+ exp"
];

// ─── Filter functions (same logic as main index.ts) ───────────────────────────

function isFresherJob(text: string): boolean {
    const t = text.toLowerCase().replace(/[\u2018\u2019]/g, "'");

    if (/(?:[1-9]|10)\s*(?:-|–|\bto\b)\s*(?:[2-9]|1[0-5])\s*(?:years|years'|yrs|yr|y\b)/gi.test(t)) return false;
    if (/(?<!\b0\s*(?:-|–|\bto\b)\s*)(?:\b[1-9]\b|\b10\b)\s*(?:years'|year's|years|year|yrs|yr)\s*(?:of\s+)?(?:[a-z']+\s+){0,3}experience/gi.test(t)) return false;
    if (/(?<!\b0\s*(?:-|–|\bto\b)\s*)(?:\b[1-9]\b|\b10\b)\s*\+\s*(?:years|year|yrs|yr|y\b)/gi.test(t)) return false;
    if (/\b(?:minimum|min|at least)\s*(?:of\s+)?(?:\b[1-9]\b|\b10\b)\s*(?:years|year|yrs|yr|y\b)/gi.test(t)) return false;
    if (/(?<!\b0\s*(?:-|–|\bto\b)\s*)(?:\b[2-9]\b|\b10\b)\s*(?:years|yrs|yr|y\b)/gi.test(t)) return false;
    if (/(?<!\b0\s*(?:-|–|\bto\b)\s*)\b(?:1|1\.0)\s*(?:years|year|yrs|yr|y|exp|experience)\b(?!\s+(?:bond|contract|training|service|agreement|warranty)\b)/gi.test(t)) return false;

    for (const phrase of EXPERIENCED_PHRASES) {
        if (t.includes(phrase)) return false;
    }
    for (const phrase of FRESHER_PHRASES) {
        if (t.includes(phrase)) return true;
    }
    return true;
}

function isSeniorJob(text: string): boolean {
    const t = text.toLowerCase().replace(/[\u2018\u2019]/g, "'");

    if (/(?:[3-9]|\d{2,})\s*(?:-|–|\bto\b)\s*(?:\d+)\s*(?:years|years'|yrs|yr|y\b)/gi.test(t)) return true;
    if (/(?<!\b[0-2]\s*(?:-|–|\bto\b)\s*)(?:\b[3-9]\b|\b\d{2,}\b)\s*(?:years'|year's|years|year|yrs|yr)\s*(?:of\s+)?(?:[a-z']+\s+){0,3}experience/gi.test(t)) return true;
    if (/(?<!\b[0-2]\s*(?:-|–|\bto\b)\s*)(?:\b[3-9]\b|\b\d{2,}\b)\s*\+\s*(?:years|year|yrs|yr|y\b)/gi.test(t)) return true;
    if (/\b(?:minimum|min|at least)\s*(?:of\s+)?(?:\b[3-9]\b|\b\d{2,}\b)\s*(?:years|year|yrs|yr|y\b)/gi.test(t)) return true;
    if (/(?<!\b[0-2]\s*(?:-|–|\bto\b)\s*)(?:\b[3-9]\b|\b\d{2,}\b)\s*(?:years|yrs|yr|y\b)/gi.test(t)) return true;

    const seniorPhrases = [
        "3+ years", "4+ years", "5+ years", "6+ years", "7+ years", "8+ years",
        "9+ years", "10+ years", "3+ yrs", "4+ yrs", "5+ yrs", "3+ exp", "4+ exp",
        "5+ exp", "6+ exp", "7+ exp", "8+ exp", "9+ exp", "10+ exp"
    ];
    return seniorPhrases.some(p => t.includes(p));
}

function hasFresherKeyword(text: string): boolean {
    const t = text.toLowerCase().replace(/[\u2018\u2019]/g, "'");
    return FRESHER_PHRASES.some(p => t.includes(p));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fileExists(p: string): Promise<boolean> {
    try { await fs.access(p); return true; } catch { return false; }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
    const reviewPath = path.join(process.cwd(), 'review_jobs.json');
    const discoveredPath = path.join(process.cwd(), 'discovered_jobs.json');

    if (!(await fileExists(reviewPath))) {
        console.log('No review_jobs.json found. Nothing to verify.');
        return;
    }

    const reviewFile: JobsFile = JSON.parse(await fs.readFile(reviewPath, 'utf-8'));
    const reviewJobs = reviewFile.jobs || [];

    if (reviewJobs.length === 0) {
        console.log('review_jobs.json is empty. Nothing to verify.');
        return;
    }

    console.log(`\n=== Review Verifier: re-analyzing ${reviewJobs.length} job(s) from aggregator text ===\n`);

    let discoveredFile: JobsFile = { version: 1, source: 'job-discovery-bot', jobs: [] };
    if (await fileExists(discoveredPath)) {
        discoveredFile = JSON.parse(await fs.readFile(discoveredPath, 'utf-8'));
        if (!discoveredFile.jobs) discoveredFile.jobs = [];
    }

    const promoted: DiscoveredJob[] = [];
    const stillReview: DiscoveredJob[] = [];

    for (const job of reviewJobs) {
        // Use the already-captured aggregator text — no browser, no network call
        const text = job.aggregatorTitle || '';

        console.log(`\nRe-checking: ${job.title}`);
        console.log(`  Source text length: ${text.length} chars`);

        if (!text || text.trim().length < 30) {
            console.log(`  -> No usable aggregator text captured. Keeping in review.`);
            stillReview.push(job);
            continue;
        }

        // Confirmed senior → discard
        if (isSeniorJob(text)) {
            console.log(`  -> Confirmed senior job (3+ yrs pattern found). Discarding.`);
            continue;
        }

        // Confirmed fresher → promote
        if (isFresherJob(text)) {
            console.log(`  ✅ Confirmed fresher-eligible. Promoting to discovered_jobs.json.`);
            const clean = { ...job };
            delete clean.reviewRequired;
            promoted.push(clean);
            continue;
        }

        // Has a fresher keyword but still fails the strict check → keep in review
        if (hasFresherKeyword(text)) {
            console.log(`  -> Has fresher keyword but fails strict experience check. Keeping in review.`);
            stillReview.push(job);
            continue;
        }

        // No fresher signal at all → discard
        console.log(`  -> No fresher signal in aggregator text. Discarding.`);
    }

    // Append promoted jobs to discovered_jobs.json
    if (promoted.length > 0) {
        discoveredFile.jobs.push(...promoted);
        await fs.writeFile(discoveredPath, JSON.stringify(discoveredFile, null, 2), 'utf-8');
    }

    // Overwrite review_jobs.json with only the still-uncertain ones
    reviewFile.jobs = stillReview;
    await fs.writeFile(reviewPath, JSON.stringify(reviewFile, null, 2), 'utf-8');

    console.log(`\n=== Verification Complete ===`);
    console.log(`Promoted to discovered : ${promoted.length}`);
    console.log(`Still in review        : ${stillReview.length}`);
    console.log(`Discarded (senior/no signal) : ${reviewJobs.length - promoted.length - stillReview.length}`);
}

run().catch(console.error);
