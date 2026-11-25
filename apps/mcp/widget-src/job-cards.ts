/**
 * Browser source for the FresherFlow job-cards MCP App.
 *
 * Bundled into a single self-contained HTML string by scripts/build-widget.mjs.
 * Layout follows apps/web/src/features/jobs/components/JobCard/JobCard.tsx,
 * but shows more of the fields a reader needs from the feed: work mode,
 * salary, experience, posted date, deadline and eligible degrees. There is no
 * company logo in JOB_SUMMARY_SHAPE, so none is drawn — no placeholder mark.
 * Every value comes from a tool result and is untrusted: text is written with
 * textContent only, and links are validated before app.openLink.
 */
import { App } from '@modelcontextprotocol/ext-apps';

const app = new App({ name: 'FresherFlow job cards', version: '1.0.0' }, {});
const root = document.getElementById('root');
const status = document.getElementById('status');

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function list(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  content?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  if (content !== undefined) el.textContent = content;
  return el;
}

/** Only https links without credentials are handed to the host. */
function httpsUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

/** Short date from an ISO value; empty when the value is not a real date. */
function day(value: unknown): string {
  const raw = text(value);
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(parsed);
}

function titleFor(job: Record<string, unknown>): string {
  return text(job.normalizedRole) || text(job.title) || text(job.company) || 'Untitled listing';
}

function typeLabel(job: Record<string, unknown>): string {
  const types = list(job.employmentTypes);
  if (types.length) {
    const first = types[0]!;
    if (/intern/i.test(first)) return 'Internship';
    if (/walk/i.test(first)) return 'Walk-in';
    if (/full[- ]?time/i.test(first)) return 'Full-time';
    return first.replace(/_/g, ' ');
  }
  const category = text(job.category);
  if (/walk/i.test(category)) return 'Walk-in';
  if (/intern/i.test(category)) return 'Internship';
  return category ? category.replace(/-/g, ' ') : '';
}

function metaRow(parent: HTMLElement, label: string, value: string): void {
  if (!value) return;
  const item = node('span', 'meta-item');
  item.append(node('span', 'meta-label', label), node('span', 'meta-value', value));
  parent.append(item);
}

function render(jobs: unknown): void {
  if (!root) return;
  root.replaceChildren();
  const rows = Array.isArray(jobs) ? jobs : [];
  if (rows.length === 0) {
    root.append(
      node('p', 'empty', 'No jobs to show yet. Ask the assistant to run get_jobs, then pass its jobs to show_job_cards.'),
    );
    return;
  }

  for (const row of rows) {
    if (typeof row !== 'object' || row === null) continue;
    const job = row as Record<string, unknown>;
    const card = node('article', 'card');

    // Header: title, then company · location · type. No logo: the feed has none.
    const titleRow = node('div', 'title-row');
    titleRow.append(node('h2', 'job-title', titleFor(job)));
    const where = node('div', 'where');
    where.append(node('span', 'company-name', text(job.company) || 'Company not listed'));
    const locations = list(job.locations);
    if (locations.length) {
      where.append(node('span', 'dot', '•'));
      where.append(node('span', 'location', locations.join(', ')));
    }
    const type = typeLabel(job);
    if (type) {
      where.append(node('span', 'dot dim', '·'));
      where.append(node('span', 'type-label', type));
    }
    titleRow.append(where);
    card.append(titleRow);

    // The fields a reader needs to decide: mode, pay, experience, dates, degree.
    const meta = node('div', 'meta');
    const mode = text(job.workMode);
    metaRow(meta, 'Mode', mode ? mode[0]! + mode.slice(1).toLowerCase() : '');
    const salary = text(job.salaryRange);
    if (salary) {
      const period = text(job.salaryPeriod);
      metaRow(meta, 'Pay', period ? `${salary} / ${period.toLowerCase()}` : salary);
    }
    const min = job.experienceMin;
    const max = job.experienceMax;
    if (typeof min === 'number' || typeof max === 'number') {
      metaRow(meta, 'Exp', `${typeof min === 'number' ? min : '?'}–${typeof max === 'number' ? max : '?'} yrs`);
    }
    metaRow(meta, 'Posted', day(job.postedAt));
    metaRow(meta, 'Closes', day(job.expiresAt));
    const degrees = list(job.allowedDegrees);
    if (degrees.length) metaRow(meta, 'Degree', degrees.join(', '));
    if (meta.childElementCount) card.append(meta);

    // Skills and one navy Apply CTA.
    const footer = node('div', 'card-footer');
    const skills = list(job.requiredSkills);
    if (skills.length) {
      const badges = node('div', 'badges');
      for (const s of skills.slice(0, 3)) badges.append(node('span', 'skill', s));
      const overflow = Math.max(0, skills.length - 3);
      if (overflow) badges.append(node('span', 'skill more', `+${overflow}`));
      footer.append(badges);
    }
    const href = httpsUrl(job.applyLink) ?? httpsUrl(job.url);
    if (href) {
      const apply = node('button', 'apply');
      apply.type = 'button';
      apply.textContent = 'Apply ↗';
      apply.addEventListener('click', () => {
        void app
          .openLink({ url: href })
          .then((result) => {
            if (result.isError && status) status.textContent = 'The host could not open this link.';
          })
          .catch(() => {
            if (status) status.textContent = 'The host could not open this link.';
          });
      });
      footer.append(apply);
    }
    card.append(footer);
    root.append(card);
  }
}

app.addEventListener('toolresult', (result) => {
  const meta = (result as { _meta?: Record<string, unknown> })._meta;
  const payload = meta?.fresherflowJobCards;
  const jobs =
    payload && typeof payload === 'object' && 'jobs' in payload
      ? (payload as { jobs?: unknown }).jobs
      : undefined;
  if (status) status.textContent = '';
  render(jobs);
});

app.addEventListener('toolcancelled', () => {
  if (status) status.textContent = 'That request was cancelled.';
});

render(undefined);
void app.connect().catch(() => {
  if (status) status.textContent = 'Could not connect to the host. Open this app from an MCP client.';
});
