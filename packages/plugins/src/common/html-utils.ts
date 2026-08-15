/**
 * HTML utility functions for ATS scrapers that return HTML descriptions.
 */

import { markdownConverter } from './description-converter.js';

const HTML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&#x2F;': '/',
  '&#x27;': "'",
  '&ndash;': '–',
  '&mdash;': '—',
  '&hellip;': '…',
  '&bull;': '•',
  '&lsquo;': '\u2018',
  '&rsquo;': '\u2019',
  '&ldquo;': '\u201C',
  '&rdquo;': '\u201D',
};

/**
 * Decode common HTML entities in a string.
 */
export function decodeHtmlEntities(html: string): string {
  let result = html;
  for (const [entity, char] of Object.entries(HTML_ENTITY_MAP)) {
    result = result.replace(new RegExp(entity, 'gi'), char);
  }
  // Handle numeric entities (&#123; and &#x1A;)
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return result;
}

import * as cheerio from 'cheerio';

export function stripHtmlTags(html: string): string {
  const $ = cheerio.load(html);
  return $.text();
}

/**
 * Convert HTML to clean plain text.
 * Handles block elements (p, div, br, li, h1-h6) with line breaks,
 * strips remaining tags, decodes entities, and normalizes whitespace.
 */
export function htmlToPlainText(html: string): string {
  // Added to fix newlines and markdown (do not remove original code below)
  if (html) {
      const md = markdownConverter(html);
      if (md) return md;
  }

  const $ = cheerio.load(html);
  $('br').replaceWith('\\n');
  $('p, div, li, h1, h2, h3, h4, h5, h6, tr, blockquote, section, article, header, footer').append('\\n');
  $('li').prepend('• ');
  let text = $.text();

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Normalize whitespace: collapse runs of spaces/tabs on same line
  text = text.replace(/[ \t]+/g, ' ');

  // Collapse more than 2 consecutive newlines into 2
  text = text.replace(/\n{3,}/g, '\n\n');

  // Trim leading/trailing whitespace from each line
  text = text
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();

  return text;
}
