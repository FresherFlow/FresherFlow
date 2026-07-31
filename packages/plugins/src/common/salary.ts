import TurndownService from 'turndown';
import * as cheerio from 'cheerio';

const turndownService = new TurndownService();

/**
 * Convert HTML description to markdown.
 * Replaces Python's markdownify(description_html).
 */
export function markdownConverter(descriptionHtml: string | null): string | null {
  if (!descriptionHtml) return null;
  return turndownService.turndown(descriptionHtml).trim();
}

/**
 * Convert HTML description to plain text.
 * Replaces Python's plain_converter using BeautifulSoup.
 */
export function plainConverter(descriptionHtml: string | null): string | null {
  if (!descriptionHtml) return null;
  const $ = cheerio.load(descriptionHtml);
  const text = $.text();
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Remove all attributes from an HTML element (keep structure, strip attrs).
 * Replaces Python's remove_attributes(tag).
 */
export function removeAttributes(html: string): string {
  const $ = cheerio.load(html, { xmlMode: false });
  $('*').each(function () {
    const el = $(this);
    const attribs = (this as any).attribs;
    if (attribs) {
      for (const attr of Object.keys(attribs)) {
        el.removeAttr(attr);
      }
    }
  });
  return $.html();
}
