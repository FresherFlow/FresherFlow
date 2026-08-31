import fs from 'node:fs/promises';
import path from 'node:path';
import { PLUGIN_REGISTRY, BOARD_SET, COMPANY_PROVIDER_SET } from '@fresherflow/plugins';

export interface IngestionTarget {
  company: string;
  ats: string;
  slug: string;
  resultsWanted?: number;
  hoursOld?: number;
  filter?: boolean;
}

function resolveAtsCdnBase(): string {
  const configured = process.env.ATS_CDN_BASE;
  if (configured) return configured.replace(/\/$/, '');
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
  if (cdnUrl) return `${cdnUrl.replace(/\/$/, '')}/api/ats/india`;
  return '';
}

export async function loadDefaultTargets(): Promise<IngestionTarget[]> {
  const targets: IngestionTarget[] = [];
  const cdnBase = resolveAtsCdnBase();

  const atsKeys = Object.keys(PLUGIN_REGISTRY).filter(
    (key) => !BOARD_SET.has(key) && !COMPANY_PROVIDER_SET.has(key)
  );

  for (const ats of atsKeys) {
    let content: Record<string, string> = {};
    if (cdnBase) {
      try {
        const res = await fetch(`${cdnBase}/${ats}.json`);
        if (res.ok) {
          content = (await res.json()) as Record<string, string>;
        }
      } catch {
        // ATS file may not be published to the CDN yet
      }
    } else {
      const filePath = path.join(process.cwd(), '../../docs/data/ats', `${ats}.json`);
      try {
        const fileData = await fs.readFile(filePath, 'utf-8');
        content = JSON.parse(fileData) as Record<string, string>;
      } catch {
        // file might not exist yet for this ATS plugin
      }
    }

    for (const [slug, company] of Object.entries(content)) {
      if (slug.startsWith('//')) continue;
      targets.push({
        company,
        ats,
        slug,
        resultsWanted: 50,
        hoursOld: 72,
        filter: true
      });
    }
  }

  for (const board of BOARD_SET) {
    targets.push({
      company: board.charAt(0).toUpperCase() + board.slice(1),
      ats: board,
      slug: board,
      resultsWanted: 50,
      hoursOld: 72,
      filter: true
    });
  }

  for (const company of COMPANY_PROVIDER_SET) {
    targets.push({
      company: company.charAt(0).toUpperCase() + company.slice(1),
      ats: company,
      slug: company,
      resultsWanted: 50,
      hoursOld: 72,
      filter: true
    });
  }

  return targets;
}