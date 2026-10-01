import fs from 'node:fs/promises';
import path from 'node:path';
import { fetchJsonWithRetry, readJsonFileSafe } from '@fresherflow/pipeline';

export interface SearchTarget {
  company: string;
  ats: string;
  slug: string;
  resultsWanted?: number;
  hoursOld?: number;
  active?: boolean;
  searchTerm?: string;
}

/**
 * All targets are loaded dynamically from CDN or local verified files.
 * No hardcoded company slugs — they go stale.
 */
export const DEFAULT_TARGETS: SearchTarget[] = [];

const ATS_PROVIDERS = [
    'greenhouse', 'lever', 'workday', 'smartrecruiters', 'myworkdayjobs', 'ashby', 'ashbyhq',
    'oracle', 'icims', 'successfactors', 'bamboohr', 'recruitee', 'jobvite', 'teamtailor', 
    'eightfold', 'darwinbox', 'zohorecruit', 'freshteam', 'keka', 'workable'
];

function processAtsData(atsName: string, data: any, targets: SearchTarget[]) {
  if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
    for (const [slug, companyName] of Object.entries(data)) {
      if (slug.startsWith('//') || slug.startsWith('_comment') || slug.startsWith('---') || slug.startsWith('===')) continue;
      if (!targets.some(t => t.company.toLowerCase() === String(companyName).toLowerCase())) {
        targets.push({ company: String(companyName).toLowerCase(), ats: atsName, slug, resultsWanted: 50, hoursOld: 10, active: true });
      }
    }
  } else if (Array.isArray(data)) {
    for (const slugEntry of data) {
      let companyName = slugEntry;
      if (atsName === 'workday' && slugEntry.includes(':')) {
        companyName = slugEntry.split(':')[0];
      }
      if (!targets.some(t => t.company.toLowerCase() === companyName.toLowerCase())) {
        targets.push({ company: companyName.toLowerCase(), ats: atsName, slug: slugEntry, resultsWanted: 50, hoursOld: 10, active: true });
      }
    }
  }
}

/**
 * Loads additional targets from CDN first, then docs/data/ats/*.json files if needed.
 */
export async function loadAtsDataTargets(): Promise<SearchTarget[]> {
  const targets: SearchTarget[] = [...DEFAULT_TARGETS];
  const CDN_URL = (process.env.NEXT_PUBLIC_CDN_URL || process.env.CDN_URL || '').trim().replace(/\/$/, '');
  
  if (CDN_URL) {
    console.log(`Fetching ATS targets from CDN (${CDN_URL}/api/ats/india)...`);
    for (const atsName of ATS_PROVIDERS) {
        // Per-provider isolation: one missing provider file must not abort the
        // whole sweep, and a transient CDN error is worth one retry.
        const res = await fetchJsonWithRetry(`${CDN_URL}/api/ats/india/${atsName}.json`, {
            label: `${atsName}.json`,
            attempts: 2,
            timeoutMs: 15_000,
        });
        if (res.ok) {
            processAtsData(atsName, res.data, targets);
        } else {
            console.warn(`  [ats] ${atsName}.json unavailable (${res.reason}); skipping this provider.`);
        }
    }
    if (targets.length > 0) {
      console.log(`Loaded ${targets.length} targets from CDN`);
      return targets;
    }
    console.warn('CDN returned no usable ATS targets. Falling back to local verified files.');
  }

  const atsDirs = [
    path.resolve(process.cwd(), '../../docs/data/ats'),
    path.resolve(process.cwd(), '../../scratch/sources/ats'),
  ];

  for (const atsDir of atsDirs) {
    // A missing directory is normal in CI (docs/data is not always checked out).
    // A malformed file inside it is not — report it rather than swallowing it.
    let files: string[];
    try {
      files = await fs.readdir(atsDir);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!file.endsWith('.json') || file === 'b.txt' || file === 'companies.json' || file.includes('-from-') || file === 'known-bad-slugs.json' || file === 'removed.json' || file === 'registry.csv') continue;
      const atsName = file.replace('.json', '');
      const filePath = path.join(atsDir, file);
      const data = await readJsonFileSafe(filePath);
      if (data === null) {
        console.warn(`  [ats] ${filePath} is missing or not valid JSON; skipping.`);
        continue;
      }
      processAtsData(atsName, data, targets);
    }
  }

  if (targets.length === 0) {
    console.warn(
      'No ATS targets could be loaded from CDN or local files. ' +
      'This sweep will find no board-based jobs — check docs/data/ats or the CDN path.',
    );
  }

  return targets;
}

export function findTargetByCompany(companyName: string, targets: SearchTarget[] = DEFAULT_TARGETS): SearchTarget | undefined {
  return targets.find(t => t.company.toLowerCase() === companyName.toLowerCase());
}
