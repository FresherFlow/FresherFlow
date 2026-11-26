import { day, safeHttpsUrl, safeLogoUrl, titleCase } from '../guards.js';

export type Open = (url: string) => Promise<boolean>;

export function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  content?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (content !== undefined) el.textContent = content;
  return el;
}

export function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function list(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown host';
  }
}

export function showLimit(shown: number, total: number): string {
  return `Showing ${shown} of ${total} — ask for more`;
}

/**
 * Listing and company URLs are untrusted tool data. Render a plain label when
 * a URL is not https so a javascript: or data: value can never be clickable.
 */
export function link(label: string, href: string, className = 'text-link'): HTMLElement {
  const url = safeHttpsUrl(href);
  if (!url) return node('span', className, label);
  const el = node('a', className, label);
  el.href = url;
  el.target = '_blank';
  el.rel = 'noopener noreferrer';
  return el;
}

export function actionButton(label: string, className: string, onClick: () => void | Promise<void>): HTMLButtonElement {
  const button = node('button', className, label);
  button.type = 'button';
  button.addEventListener('click', () => {
    void Promise.resolve(onClick()).catch(() => undefined);
  });
  return button;
}

/** Apply CTA. Content-width; offers a copyable URL only when the host refuses. */
export function applyButton(href: string, open: Open, label = 'Apply ↗'): HTMLElement {
  const wrap = node('div', 'apply-wrap');
  const button = actionButton(label, 'apply', async () => {
    const ok = await open(href);
    if (!ok && !wrap.querySelector('input[readonly]')) {
      const hint = node('p', 'apply-failed', `Host couldn't open the link — copy it below.`);
      const input = document.createElement('input');
      input.setAttribute('readonly', '');
      input.value = href;
      wrap.append(hint, input);
    }
  });
  wrap.append(button);
  return wrap;
}

export function section(title: string, body: HTMLElement): HTMLElement {
  const wrap = node('section', 'section');
  wrap.append(node('h3', 'section-title', title), body);
  return wrap;
}

/** Company mark: CDN logo when available, initials tile on load failure. */
export function companyBadge(company: string, logoUrl: unknown, className = 'card-logo'): HTMLElement {
  const initial = (company || '?').trim().charAt(0).toUpperCase() || '?';
  const fallback = node('span', `${className} logo-fallback`, initial);
  const url = safeLogoUrl(logoUrl);
  if (!url) return fallback;
  const img = document.createElement('img');
  img.src = url;
  img.alt = `${company} logo`;
  img.className = className;
  img.addEventListener('error', () => img.replaceWith(fallback));
  return img;
}

/** Open/closed status derived from the listing deadline, never invented. */
export function statusChip(expiresAt: unknown): HTMLElement | null {
  if (typeof expiresAt !== 'string' || !day(expiresAt)) return null;
  const closed = new Date(expiresAt).getTime() < Date.now();
  return node('span', closed ? 'status-chip closed' : 'status-chip open', closed ? 'Closed' : 'Open');
}

/** A labelled block inside the single detail card, separated by a hairline. */
export function block(title: string, body: HTMLElement): HTMLElement {
  const wrap = node('section', 'detail-block');
  wrap.append(node('h3', 'section-title', title), body);
  return wrap;
}

export function rows(items: Array<[string, string]>): HTMLElement {
  const dl = node('dl', 'facts');
  for (const [label, value] of items) {
    if (!value) continue;
    dl.append(node('dt', 'fact-label', label), node('dd', 'fact-value', value));
  }
  return dl;
}

export function skillChips(skills: string[], limit = 2): HTMLElement {
  const wrap = node('div', 'badges');
  for (const skill of skills.slice(0, limit)) wrap.append(node('span', 'skill', titleCase(skill)));
  const overflow = Math.max(0, skills.length - limit);
  if (overflow) wrap.append(node('span', 'skill more', `+${overflow}`));
  return wrap;
}

export function renderFallback(textFromTool: string): HTMLElement {
  const fallback = node('div', 'fallback');
  fallback.append(node('p', 'fallback-title', "Couldn't display this result"));
  if (textFromTool) fallback.append(node('p', 'fallback-text', textFromTool));
  return fallback;
}
