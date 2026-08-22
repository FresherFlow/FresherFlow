import fs from 'node:fs/promises';
import path from 'node:path';

export const CORE_SEARCH_KEYWORDS = [
  'Software Engineer Fresher',
  'Software Developer Intern',
  'Graduate Engineer Trainee',
  'Full Stack Developer Fresher',
  'Frontend Developer Intern',
  'Backend Developer Intern',
  'Python Developer Fresher',
  'Java Developer Fresher',
  'Data Analyst Fresher',
  'AI / ML Intern',
  'QA / Automation Intern',
  'DevOps Engineer Fresher',
];

export async function loadRolesFromCdn(): Promise<string[]> {
  try {
    const CDN_URL = (process.env.NEXT_PUBLIC_CDN_URL || process.env.CDN_URL || 'https://cdn.fresherflow.in').trim().replace(/\/$/, '');
    const res = await fetch(`${CDN_URL}/api/meta/roles.json`, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const roles: string[] = await res.json();
      if (Array.isArray(roles) && roles.length > 0) {
        return roles.slice(0, 20);
      }
    }
  } catch {
    // Fallback
  }
  return CORE_SEARCH_KEYWORDS;
}

export async function loadEnv() {
  const envPath = path.resolve(process.cwd(), '../../.env');
  try {
    const content = await fs.readFile(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || '').trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (process.env[key] === undefined) process.env[key] = val;
      }
    }
  } catch {
    // Ignore if not present
  }
}
