import { day, typeLabel, workModeLabel, titleCase } from '../guards.js';
import { actionButton, applyButton, block, companyBadge, list, node, rows, skillChips, statusChip, text, type Open } from './shared.js';

/** Shared follow-up action type, re-exported for the submission renderer. */
export type Ask = (message: string) => void;

/**
 * One compact inline card, in the same order as the web job page: title and
 * company, tag chips, key facts, eligibility, skills, description and two
 * actions. Two actions is the ChatGPT inline-card maximum.
 */
export function renderDetail(data: unknown, open: Open): HTMLElement {
  const job = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const root = node('div', 'view detail-view');
  const card = node('article', 'detail-card');

  const header = node('div', 'detail-header');
  header.append(companyBadge(text(job.company), job.companyLogoUrl, 'company-logo'));
  const identity = node('div', 'detail-identity');
  identity.append(node('h1', 'detail-title', text(job.title) || 'Untitled listing'));
  const meta = node('div', 'job-meta');
  meta.append(node('span', 'company', text(job.company) || 'Company not listed'));
  const locations = list(job.locations);
  if (locations.length) meta.append(node('span', 'dot', '·'), node('span', 'location', locations.join(', ')));
  identity.append(meta);
  header.append(identity);
  card.append(header);

  const type = typeLabel(job);
  if (type) {
    const chips = node('div', 'detail-chips');
    chips.append(node('span', 'type-chip', type));
    const status = statusChip(job.expiresAt);
    if (status) chips.append(status);
    const mode = workModeLabel(job);
    if (mode) chips.append(node('span', 'posted-chip', mode));
    card.append(chips);
  }

  const skills = list(job.requiredSkills);

  const facts = rows([
    ['Location', list(job.locations).join(', ')],
    ['Work mode', workModeLabel(job)],
    ['Employment', type],
    ['Experience', typeof job.experienceMin === 'number' || typeof job.experienceMax === 'number'
      ? `${job.experienceMin ?? '?'}–${job.experienceMax ?? '?'} yrs` : ''],
    ['Pay', text(job.salaryRange) || text(job.stipend)
      || (typeof job.salaryMin === 'number' || typeof job.salaryMax === 'number'
        ? `${job.salaryMin ?? '?'}–${job.salaryMax ?? '?'} / ${text(job.salaryPeriod).toLowerCase()}` : '')],
    ['Posted', day(job.postedAt)],
    ['Closes', day(job.expiresAt)],
  ]);
  if (facts.childElementCount) card.append(block('Key facts', facts));

  const eligibility = rows([
    ['Degrees', list(job.allowedDegrees).map(titleCase).join(', ')],
    ['Courses', list(job.allowedCourses).map(titleCase).join(', ')],
    ['Specialisations', list(job.allowedSpecializations).map(titleCase).join(', ')],
    ['Pass-out years', list(job.allowedPassoutYears as unknown[]).map(String).join(', ')],
  ]);
  if (eligibility.childElementCount) card.append(block('Eligibility', eligibility));

  if (skills.length) card.append(block('Required skills', skillChips(skills, 6)));

  const drive = job.driveDetails && typeof job.driveDetails === 'object' ? job.driveDetails as Record<string, unknown> : null;
  const government = job.governmentJobDetails && typeof job.governmentJobDetails === 'object'
    ? job.governmentJobDetails as Record<string, unknown> : null;
  const special = rows([
    ['Drive date', text(drive?.dateRange) || list(drive?.dates).join(', ')],
    ['Timing', text(drive?.timeRange)],
    ['Venue', text(drive?.venueAddress)],
    ['Post', text(government?.postName)],
    ['Vacancies', typeof government?.vacancyCount === 'number' ? String(government.vacancyCount) : ''],
    ['Department', text(government?.department)],
  ]);
  if (special.childElementCount) card.append(block('Drive and vacancy details', special));

  const description = text(job.description);
  if (description) {
    const body = node('div', 'description');
    const copy = node('p', 'description-text', '');
    const PREVIEW = 240;
    let expanded = false;
    const paint = () => {
      copy.textContent = expanded || description.length <= PREVIEW
        ? description
        : `${description.slice(0, PREVIEW).trimEnd()}…`;
    };
    paint();
    body.append(copy);
    if (description.length > PREVIEW) {
      const more = node('button', 'show-more', 'Show more');
      more.type = 'button';
      more.addEventListener('click', () => {
        expanded = !expanded;
        paint();
        more.textContent = expanded ? 'Show less' : 'Show more';
      });
      body.append(more);
    }
    if (job.descriptionTruncated === true) {
      body.append(node('p', 'muted', 'Description truncated — ask the assistant for the full posting.'));
    }
    card.append(block('About the role', body));
  }

  const actions = node('div', 'actions');
  const href = text(job.applyLink) || text(job.url);
  if (href) actions.append(applyButton(href, open, 'Apply ↗'));
  if (text(job.url)) {
    const canonical = text(job.url);
    actions.append(actionButton('View on FresherFlow', 'view-button', () => { void open(canonical); }));
  }
  if (actions.childElementCount) card.append(actions);

  root.append(card);
  return root;
}
