/**
 * extract-ats-boards.ts
 *
 * Reads docs/companiesdata links.json and maps each company
 * to its detected ATS provider, outputting per-provider JSON files
 * ready to upload to the CDN /ats/ directory.
 *
 * Run: npx tsx scripts/job-discovery/extract-ats-boards.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';

interface CompanyEntry {
    company: string;
    companyWebsite: string | null;
    job_count: number;
    sample_apply_link: string;
}

interface AtsBoards {
    [provider: string]: Record<string, string>; // { companyId: companyName }
}

// ── ATS detection rules ────────────────────────────────────────────────────────
function detectAts(link: string): { provider: string; companyId: string } | null {
    try {
        const url = new URL(link);
        const host = url.hostname.toLowerCase();
        const pathname = url.pathname.toLowerCase();

        // Workday: *.myworkdayjobs.com or *.wd1/wd3/wd5.myworkdayjobs.com
        const workdayMatch = host.match(/^([a-z0-9-]+)\.wd\d+\.myworkdayjobs\.com$/)
            ?? host.match(/^([a-z0-9-]+)\.myworkdayjobs\.com$/);
        if (workdayMatch) return { provider: 'workday', companyId: workdayMatch[1] };

        // Greenhouse: job-boards.greenhouse.io/BOARD or boards.greenhouse.io/BOARD
        if (host === 'job-boards.greenhouse.io' || host === 'boards.greenhouse.io') {
            const parts = pathname.split('/').filter(Boolean);
            if (parts[0]) return { provider: 'greenhouse', companyId: parts[0] };
        }

        // Lever: jobs.lever.co/COMPANY
        if (host === 'jobs.lever.co') {
            const parts = pathname.split('/').filter(Boolean);
            if (parts[0]) return { provider: 'lever', companyId: parts[0] };
        }

        // Ashby: jobs.ashbyhq.com/COMPANY
        if (host === 'jobs.ashbyhq.com' || host === 'api.ashbyhq.com') {
            const parts = pathname.split('/').filter(Boolean);
            if (parts[0]) return { provider: 'ashby', companyId: parts[0] };
        }

        // SmartRecruiters: jobs.smartrecruiters.com/COMPANY
        if (host === 'jobs.smartrecruiters.com') {
            const parts = pathname.split('/').filter(Boolean);
            if (parts[0]) return { provider: 'smartrecruiters', companyId: parts[0] };
        }

        // Oracle Cloud: *.fa.*.oraclecloud.com
        const oracleMatch = host.match(/^([a-z0-9]+)\.fa\.[a-z0-9]+\.oraclecloud\.com$/);
        if (oracleMatch) return { provider: 'oracle', companyId: oracleMatch[1] };

        // iCIMS: careers.icims.com or *.icims.com
        if (host === 'icims.com' || host.endsWith('.icims.com')) {
            const subMatch = host.match(/^([a-z0-9-]+)\.icims\.com$/);
            if (subMatch && subMatch[1] !== 'careers') {
                return { provider: 'icims', companyId: subMatch[1] };
            }
        }

        // SAP SuccessFactors: *.successfactors.com or *.sapsf.com
        if (host.match(/successfactors\.[a-z]+$/) || host === 'sapsf.com' || host.endsWith('.sapsf.com')) {
            const subMatch = host.match(/^([a-z0-9-]+)\./);
            if (subMatch) return { provider: 'successfactors', companyId: subMatch[1] };
        }

        // BambooHR: *.bamboohr.com
        const bambooMatch = host.match(/^([a-z0-9-]+)\.bamboohr\.com$/);
        if (bambooMatch) return { provider: 'bamboohr', companyId: bambooMatch[1] };

        // Recruitee: *.recruitee.com
        const recruiteeMatch = host.match(/^([a-z0-9-]+)\.recruitee\.com$/);
        if (recruiteeMatch) return { provider: 'recruitee', companyId: recruiteeMatch[1] };

        // Jobvite: jobs.jobvite.com/COMPANY
        if (host === 'jobs.jobvite.com') {
            const parts = pathname.split('/').filter(Boolean);
            if (parts[0]) return { provider: 'jobvite', companyId: parts[0] };
        }

        // Teamtailor: *.teamtailor.com or careers.teamtailor.com
        const teamtailorMatch = host.match(/^([a-z0-9-]+)\.teamtailor\.com$/);
        if (teamtailorMatch && teamtailorMatch[1] !== 'careers') {
            return { provider: 'teamtailor', companyId: teamtailorMatch[1] };
        }

        // Eightfold: *.eightfold.ai
        const eightfoldMatch = host.match(/^([a-z0-9-]+)\.eightfold\.ai$/);
        if (eightfoldMatch) return { provider: 'eightfold', companyId: eightfoldMatch[1] };

        // DarwinBox: *.darwinbox.com
        const darwinboxMatch = host.match(/^([a-z0-9-]+)\.darwinbox\.com$/);
        if (darwinboxMatch) return { provider: 'darwinbox', companyId: darwinboxMatch[1] };

        // Taleo: *.taleo.net
        const taleoMatch = host.match(/^([a-z0-9-]+)\.taleo\.net$/);
        if (taleoMatch) return { provider: 'taleo', companyId: taleoMatch[1] };

        return null;
    } catch {
        return null;
    }
}

async function main() {
    const jsonPath = path.resolve('docs/companiesdata links.json');
    const raw = await fs.readFile(jsonPath, 'utf-8');
    const companies: CompanyEntry[] = JSON.parse(raw);

    const boards: AtsBoards = {};
    const undetected: { company: string; link: string }[] = [];

    for (const entry of companies) {
        if (!entry.sample_apply_link) continue;

        const detected = detectAts(entry.sample_apply_link);
        if (!detected) {
            undetected.push({ company: entry.company, link: entry.sample_apply_link });
            continue;
        }

        const { provider, companyId } = detected;
        if (!boards[provider]) boards[provider] = {};

        // Prefer higher job_count entries (don't overwrite if same companyId already added)
        if (!boards[provider][companyId]) {
            boards[provider][companyId] = entry.company;
        }
    }

    // Write output files
    const outDir = path.resolve('scripts/job-discovery/ats-boards');
    await fs.mkdir(outDir, { recursive: true });

    for (const [provider, data] of Object.entries(boards)) {
        const outPath = path.join(outDir, `${provider}.json`);
        await fs.writeFile(outPath, JSON.stringify(data, null, 2));
        console.log(`✓ ${provider}.json — ${Object.keys(data).length} companies`);
    }

    console.log(`\n⚠ Undetected (${undetected.length} companies — need custom/Phase 3 handling):`);
    for (const u of undetected.slice(0, 20)) {
        console.log(`  ${u.company}: ${u.link}`);
    }
    if (undetected.length > 20) console.log(`  ...and ${undetected.length - 20} more`);

    console.log(`\n✅ Done. Upload the files in scripts/job-discovery/ats-boards/ to your CDN /ats/ directory.`);
}

main().catch(console.error);
