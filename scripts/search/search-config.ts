import fs from 'node:fs/promises';
import path from 'node:path';

export interface SearchTarget {
  company: string;
  ats: string;
  slug: string;
  resultsWanted?: number;
  hoursOld?: number;
  active?: boolean;
}

/**
 * India-first target registry + global tech hiring in India.
 * Verified company slugs from docs/data/ats/*.json
 */
export const DEFAULT_TARGETS: SearchTarget[] = [
  // India Tech / Startups (Verified Slugs)
  { company: 'razorpay', ats: 'greenhouse', slug: 'razorpaysoftwareprivatelimited', resultsWanted: 50, hoursOld: 72, active: true },
  { company: 'cred', ats: 'lever', slug: 'cred', resultsWanted: 50, hoursOld: 72, active: true },
  { company: 'urbancompany', ats: 'lever', slug: 'urbancompany', resultsWanted: 50, hoursOld: 72, active: true },
  { company: 'slice', ats: 'lever', slug: 'slice', resultsWanted: 50, hoursOld: 72, active: true },
  { company: 'canonical', ats: 'greenhouse', slug: 'canonical', resultsWanted: 50, hoursOld: 72, active: true },
  { company: 'figma', ats: 'greenhouse', slug: 'figma', resultsWanted: 50, hoursOld: 72, active: true },
  { company: 'coinbase', ats: 'greenhouse', slug: 'coinbase', resultsWanted: 50, hoursOld: 72, active: true },
  { company: 'airbnb', ats: 'greenhouse', slug: 'airbnb', resultsWanted: 50, hoursOld: 72, active: true },
  { company: 'hotstar', ats: 'lever', slug: 'hotstar', resultsWanted: 50, hoursOld: 72, active: true },
  { company: 'zeta', ats: 'lever', slug: 'zeta', resultsWanted: 50, hoursOld: 72, active: true },

  // Global Tech Leaders hiring in India (Company scrapers)
  { company: 'google', ats: 'company-google', slug: 'google', resultsWanted: 50, hoursOld: 72, active: true },
  { company: 'microsoft', ats: 'company-microsoft', slug: 'microsoft', resultsWanted: 50, hoursOld: 72, active: true },
  { company: 'amazon', ats: 'company-amazon', slug: 'amazon', resultsWanted: 50, hoursOld: 72, active: true },
  { company: 'apple', ats: 'company-apple', slug: 'apple', resultsWanted: 50, hoursOld: 72, active: true },
  { company: 'meta', ats: 'company-meta', slug: 'meta', resultsWanted: 50, hoursOld: 72, active: true },
  { company: 'uber', ats: 'company-uber', slug: 'uber', resultsWanted: 50, hoursOld: 72, active: true },
  { company: 'stripe', ats: 'company-stripe', slug: 'stripe', resultsWanted: 50, hoursOld: 72, active: true },
  { company: 'ibm', ats: 'company-ibm', slug: 'ibm', resultsWanted: 50, hoursOld: 72, active: true },
  { company: 'nvidia', ats: 'company-nvidia', slug: 'nvidia', resultsWanted: 50, hoursOld: 72, active: true },

  // Aggregator Boards (Direct Search)
  { company: 'internshala', ats: 'internshala', slug: 'software fresher', resultsWanted: 100, hoursOld: 72, active: true },
  { company: 'naukri', ats: 'naukri', slug: 'software engineer fresher', resultsWanted: 100, hoursOld: 72, active: true }
];

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
        targets.push({ company: String(companyName).toLowerCase(), ats: atsName, slug, resultsWanted: 50, hoursOld: 72, active: true });
      }
    }
  } else if (Array.isArray(data)) {
    for (const slugEntry of data) {
      let companyName = slugEntry;
      if (atsName === 'workday' && slugEntry.includes(':')) {
        companyName = slugEntry.split(':')[0];
      }
      if (!targets.some(t => t.company.toLowerCase() === companyName.toLowerCase())) {
        targets.push({ company: companyName.toLowerCase(), ats: atsName, slug: slugEntry, resultsWanted: 50, hoursOld: 72, active: true });
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
    console.log(`Fetching ATS targets from CDN (${CDN_URL}/ats)...`);
    for (const atsName of ATS_PROVIDERS) {
      try {
        const res = await fetch(`${CDN_URL}/ats/${atsName}.json`);
        if (res.ok) {
          const data = await res.json();
          processAtsData(atsName, data, targets);
        }
      } catch (err) {
         // silently continue to next
      }
    }
    if (targets.length > DEFAULT_TARGETS.length) {
      return targets; // Successfully loaded from CDN
    }
  }

  const atsDirs = [
    path.resolve(process.cwd(), '../../docs/data/ats'),
    path.resolve(process.cwd(), '../../scratch/sources/ats'),
  ];

  for (const atsDir of atsDirs) {
  try {
    const files = await fs.readdir(atsDir);
    for (const file of files) {
      if (!file.endsWith('.json') || file === 'b.txt' || file === 'companies.json' || file.includes('-from-') || file === 'known-bad-slugs.json' || file === 'removed.json' || file === 'registry.csv') continue;
      const atsName = file.replace('.json', '');
      const filePath = path.join(atsDir, file);
      try {
        const raw = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(raw);
        processAtsData(atsName, data, targets);
      } catch {
        // Skip malformed JSON
      }
    }
  } catch {
    // directory not accessible, continue
  }
  } // end for atsDir

  return targets;
}

export function findTargetByCompany(companyName: string, targets: SearchTarget[] = DEFAULT_TARGETS): SearchTarget | undefined {
  return targets.find(t => t.company.toLowerCase() === companyName.toLowerCase());
}
