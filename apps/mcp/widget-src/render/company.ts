import { safeLogoUrl, day, typeLabel } from '../guards.js';
import { link, list, node, showLimit, text } from './shared.js';

export function renderCompany(data: unknown): HTMLElement {
  const view = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const company = view.company && typeof view.company === 'object' ? view.company as Record<string, unknown> : null;
  const jobs = Array.isArray(view.jobs) ? view.jobs : [];
  const total = typeof view.total === 'number' ? view.total : jobs.length;
  const root = node('div', 'view company-view');
  const header = node('div', 'company-header');
  const logo = safeLogoUrl(company?.logoUrl);
  if (logo) {
    const img = document.createElement('img');
    img.setAttribute('src', logo);
    img.setAttribute('alt', `${text(company?.name)} logo`);
    img.className = 'company-logo';
    header.append(img);
  }
  const identity = node('div', 'detail-identity');
  identity.append(node('h1', 'detail-title', text(company?.name) || 'Company'));
  if (text(company?.url)) identity.append(link('Company website ↗', text(company?.url)));
  header.append(identity);
  root.append(header);

  root.append(node('p', 'company-count', `${total} available opportunities`));
  if (!view.found || !jobs.length) {
    root.append(node('p', 'empty', 'No live jobs for this company right now.'));
    return root;
  }

  const cap = Math.min(6, jobs.length);
  for (const row of jobs.slice(0, cap)) {
    const job = row && typeof row === 'object' ? row as Record<string, unknown> : {};
    const item = node('article', 'company-job');
    const line = node('div', 'company-job-line');
    line.append(node('span', 'job-title', text(job.title)));
    const meta = node('div', 'where');
    const locations = list(job.locations);
    if (locations.length) meta.append(node('span', 'location', locations.join(', ')));
    const type = typeLabel(job);
    if (type) meta.append(node('span', 'type-label', type));
    const posted = day(job.postedAt);
    if (posted) meta.append(node('span', 'dot', '·'), node('span', 'location', posted));
    line.append(meta);
    item.append(line);
    const href = text(job.url) || text(job.applyLink);
    if (href) item.append(link('View job →', href, 'text-link'));
    root.append(item);
  }
  if (total > cap || view.truncated === true) root.append(node('p', 'limit', showLimit(cap, Math.max(total, cap + 1))));
  return root;
}
