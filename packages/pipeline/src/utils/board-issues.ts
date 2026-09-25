/**
 * Community board intake — files `new_role` issues on the board repo
 * (default: FresherFlow/India-Jobs-Internships) for jobs our bots already
 * discovered and are already announcing.
 *
 * The board repo owns approval + publishing: its `contribution-approved.yml`
 * runs on `issues: [labeled]` when `approved` is added, appends the role to its
 * data/jobs.json and rebuilds its site. This module is only the intake, and it
 * is called by the existing discovery/search bots — there is no separate bot.
 *
 * Issue contract (matches that repo's scripts/process-contribution.js):
 *   - title : "New Role: <company> - <title>"
 *   - labels: `new_role` at creation, then `approved` is added in a SECOND call
 *     so the board's `issues: [labeled]` trigger fires reliably.
 *   - body  : "### <Field>" sections; the board splits on /\n(?=### )/ and reads
 *     headings, so each value must be on a SINGLE line.
 *
 * Env (all optional; publishing is OFF unless explicitly enabled):
 *   BOARD_PUBLISH_ENABLED   "true" to enable            (default: false)
 *   BOARD_PUBLISH_DRY_RUN   "true" to only log          (default: true)
 *   BOARD_PUBLISH_MAX_PER_RUN   max issues per bot run  (default: 5)
 *   BOARD_PUBLISH_DELAY_MS      delay between issues    (default: 4000)
 *   BOARD_PUBLISH_AUTO_APPROVE  add `approved` after create (default: true)
 *   JOBS_REPO                 target repo               (default: India-Jobs-Internships)
 *   JOBS_REPO_TOKEN           PAT with issues:write on the target repo
 */

const GH_API = 'https://api.github.com';

export interface BoardJob {
    title: string;
    company: string;
    applyLink: string;
    companyWebsite?: string;
    locations?: string[];
    requiredSkills?: string[];
    allowedPassoutYears?: number[];
}

export type BoardPostResult =
    | { status: 'skipped'; reason: string }
    | { status: 'dry-run'; reason: string }
    | { status: 'duplicate'; reason: string }
    | { status: 'created'; issueUrl: string; issueNumber: number; approved: boolean }
    | { status: 'failed'; reason: string };

export interface BoardPublisher {
    post(job: BoardJob): Promise<BoardPostResult>;
    summary(): { eligible: number; created: number; skipped: number; failed: number };
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const blog = (msg: string) => console.log(`[board] ${msg}`);

function envBool(name: string, dflt: boolean): boolean {
    const v = (process.env[name] || '').trim().toLowerCase();
    if (!v) return dflt;
    return v === 'true' || v === '1' || v === 'yes';
}

function normBoardUrl(raw: string): string {
    try {
        const u = new URL(raw);
        u.hash = '';
        u.hostname = u.hostname.replace(/^www\./, '').toLowerCase();
        return u.toString().replace(/\/$/, '');
    } catch {
        return raw.trim().toLowerCase();
    }
}

const JUNK_TITLE = /^(?:job\s*details?|jobs?|careers?|apply|home|search|listing|listings|untitled|new role|role|opportunity|opportunities|details?|n\/a|na|test|\-+)$/i;
const JUNK_COMPANY = /^(?:unknown|not specified|n\/a|na|company|corporate|hiring|test|your company|xyz|abc|tbd|\-+)$/i;

/** Reject junk before touching GitHub. The board's own workflow also guards this. */
export function boardRejectReason(job: BoardJob): string | null {
    if (!job.applyLink) return 'no applyLink';
    let u: URL;
    try {
        u = new URL(job.applyLink);
    } catch {
        return 'applyLink is not a valid URL';
    }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return 'applyLink is not http(s)';
    if (!job.title || job.title.trim().length < 3) return 'title too short';
    if (job.title.length > 160) return 'title too long';
    if (JUNK_TITLE.test(job.title.trim())) return 'junk/generic title';
    if (/https?:\/\//i.test(job.title)) return 'title contains a URL';
    if (!job.company || job.company.trim().length < 2) return 'company missing';
    if (JUNK_COMPANY.test(job.company.trim())) return 'junk/generic company';
    if (/https?:\/\//i.test(job.company)) return 'company contains a URL';
    if (!job.locations || job.locations.length === 0) return 'no location';
    return null;
}

export function buildBoardIssueTitle(job: BoardJob): string {
    const clean = (s: string) => s.replace(/\s+/g, ' ').trim().replace(/[#\[\]]/g, '');
    return `New Role: ${clean(job.company)} - ${clean(job.title)}`;
}

export function buildBoardIssueBody(job: BoardJob): string {
    const oneLine = (v: string) => String(v).replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    // Provenance goes ABOVE the first "###" heading: the board's parser splits on
    // /\n(?=### )/ and skips any block that does not start with a heading, so a
    // trailing note would otherwise be swallowed into the last field's value.
    const out: string[] = ['_Submitted automatically by a FresherFlow discovery bot (deterministic extraction, no LLM)._', ''];
    const field = (label: string, value: string) => {
        out.push(`### ${label}`);
        out.push(value.trim() || '_No response_');
        out.push('');
    };
    field('Link to Job Posting', job.applyLink);
    field('Company Name', oneLine(job.company));
    field('Job Title', oneLine(job.title));
    field('Location', job.locations?.length ? oneLine(job.locations.join(' | ')) : 'Multiple locations');
    field('Company website', job.companyWebsite ? oneLine(job.companyWebsite) : '');
    field('Required Skills', job.requiredSkills?.length ? oneLine(job.requiredSkills.slice(0, 15).join(', ')) : '');
    field('Allowed Passout Years', job.allowedPassoutYears?.length ? oneLine(job.allowedPassoutYears.join(', ')) : '');
    field('Is the posting currently accepting applications?', 'Yes');
    return out.join('\n');
}

/**
 * Returns null when publishing is disabled or unconfigured, so callers can do
 * `const board = createBoardPublisher(); if (board) await board.post(...)`.
 */
export function createBoardPublisher(): BoardPublisher | null {
    const token = (process.env.JOBS_REPO_TOKEN || '').trim();
    const repo = (process.env.JOBS_REPO || 'FresherFlow/India-Jobs-Internships').trim();

    if (!envBool('BOARD_PUBLISH_ENABLED', false)) return null;
    if (!token) {
        blog('BOARD_PUBLISH_ENABLED=true but JOBS_REPO_TOKEN is missing — skipping.');
        return null;
    }

    const dryRun = envBool('BOARD_PUBLISH_DRY_RUN', true);
    const autoApprove = envBool('BOARD_PUBLISH_AUTO_APPROVE', true);
    const maxPerRun = parseInt(process.env.BOARD_PUBLISH_MAX_PER_RUN || '5', 10) || 5;
    const delayMs = parseInt(process.env.BOARD_PUBLISH_DELAY_MS || '4000', 10) || 0;
    const boardJobsJson = (process.env.BOARD_JOBS_JSON
        || 'https://raw.githubusercontent.com/FresherFlow/India-Jobs-Internships/main/data/jobs.json').trim();

    const stats = { eligible: 0, created: 0, skipped: 0, failed: 0 };
    const seen = new Set<string>();
    let indexLoaded = false;

    const ghFetch = async (path: string, init: RequestInit = {}, attempt = 1): Promise<Response> => {
        const res = await fetch(`${GH_API}${path}`, {
            ...init,
            headers: {
                'Accept': 'application/vnd.github+json',
                'Authorization': `Bearer ${token}`,
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'FresherFlow-Discovery-Bot',
                ...(init.headers || {}),
            },
        });
        if ((res.status === 403 || res.status === 429) && attempt <= 3) {
            if (res.headers.get('x-ratelimit-remaining') === '0') {
                const reset = parseInt(res.headers.get('x-ratelimit-reset') || '0', 10);
                const waitMs = Math.max(0, reset * 1000 - Date.now()) + 2000;
                blog(`rate limited — waiting ${Math.ceil(waitMs / 1000)}s`);
                await sleep(waitMs);
            } else {
                await sleep(2000 * attempt);
            }
            return ghFetch(path, init, attempt + 1);
        }
        return res;
    };

    // Dedupe index: the board's live feed + its recent new_role issues.
    const loadIndex = async (): Promise<void> => {
        if (indexLoaded) return;
        indexLoaded = true;
        try {
            const res = await fetch(boardJobsJson, { signal: AbortSignal.timeout(15000) });
            if (res.ok) {
                const data = await res.json() as { jobs?: Array<{ applyLink?: string }> };
                for (const j of data.jobs || []) if (j.applyLink) seen.add(normBoardUrl(j.applyLink));
            }
        } catch { /* dedupe degrades to issues-only */ }
        try {
            const res = await ghFetch(`/repos/${repo}/issues?state=all&labels=new_role&per_page=100&sort=created&direction=desc`);
            if (res.ok) {
                const list = await res.json() as Array<{ body?: string }>;
                for (const issue of list) {
                    const m = (issue.body || '').match(/###\s*Link to Job Posting\s*\n\s*(\S+)/i);
                    if (m && m[1]) seen.add(normBoardUrl(m[1]));
                }
            }
        } catch { /* ignore */ }
        blog(`dedupe index ready (${seen.size} known board URLs)`);
    };


    return {
        summary: () => ({ ...stats }),

        async post(job: BoardJob): Promise<BoardPostResult> {
            const bad = boardRejectReason(job);
            if (bad) {
                stats.skipped++;
                return { status: 'skipped', reason: bad };
            }
            await loadIndex();
            const key = normBoardUrl(job.applyLink);
            if (seen.has(key)) {
                stats.skipped++;
                return { status: 'duplicate', reason: 'already on board' };
            }
            if (stats.created >= maxPerRun) {
                stats.skipped++;
                return { status: 'skipped', reason: `max per run (${maxPerRun})` };
            }

            stats.eligible++;
            const title = buildBoardIssueTitle(job);
            const body = buildBoardIssueBody(job);

            if (dryRun) {
                blog(`DRY RUN would open: "${title}"`);
                return { status: 'dry-run', reason: 'dry-run' };
            }

            const createRes = await ghFetch(`/repos/${repo}/issues`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, body, labels: ['new_role'] }),
            });
            if (!createRes.ok) {
                const err = (await createRes.text()).slice(0, 160);
                stats.failed++;
                blog(`create failed (${createRes.status}): ${err}`);
                return { status: 'failed', reason: `${createRes.status}` };
            }
            const issue = await createRes.json() as { number: number; html_url: string };
            seen.add(key);
            stats.created++;

            // Add `approved` separately so the board's labeled-event workflow runs.
            let approved = false;
            if (autoApprove) {
                const res = await ghFetch(`/repos/${repo}/issues/${issue.number}/labels`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ labels: ['approved'] }),
                });
                approved = res.ok;
                if (!approved) blog(`#${issue.number} created but not approved — maintainer action needed`);
            }
            blog(`filed #${issue.number}: ${title}`);
            if (delayMs > 0) await sleep(delayMs);
            return { status: 'created', issueUrl: issue.html_url, issueNumber: issue.number, approved };
        },
    };
}

