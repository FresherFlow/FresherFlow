/** Pure helpers shared by the MCP App renderers and their unit tests. */

export function safeHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function safeLogoUrl(value: unknown): string | undefined {
  const href = safeHttpsUrl(value);
  if (!href) return undefined;
  const h = new URL(href).hostname;
  if (h === 'cdn.fresherflow.in' || h.endsWith('.cdn.fresherflow.in')) return href;
  if (h === 'logo.clearbit.com') return href;
  return undefined;
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const TYPE_LABELS: Record<string, string> = {
  EMPLOYMENT: 'Job',
  JOB: 'Job',
  INTERNSHIP: 'Internship',
  INTERN: 'Internship',
  WALK_IN: 'Walk-in',
  WALKIN: 'Walk-in',
  GOVERNMENT: 'Government',
  DEGREE: 'Degree',
};

export function typeLabel(job: Record<string, unknown>): string {
  const types = Array.isArray(job.employmentTypes)
    ? job.employmentTypes.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    : [];
  const raw = types[0] ?? (typeof job.category === 'string' ? job.category : '');
  if (!raw) return '';
  const key = raw.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return TYPE_LABELS[key] ?? titleCase(raw);
}

export function workModeLabel(job: Record<string, unknown>): string {
  if (typeof job.workMode !== 'string' || !job.workMode.trim()) return '';
  const key = job.workMode.trim().toUpperCase();
  return (
    { ONSITE: 'On-site', HYBRID: 'Hybrid', REMOTE: 'Remote', ON_SITE: 'On-site' }[key] ??
    titleCase(job.workMode)
  );
}

export function day(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(parsed);
}
