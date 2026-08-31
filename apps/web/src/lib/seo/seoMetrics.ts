/**
 * Server-safe SERP font metrics & truncation utilities
 * Calibrated against Google Search snippet limits (Desktop: ~580px Arial, Mobile: ~490px Arial)
 */

export const SERP_LIMITS = {
  desktop: { title: 580, desc: 990 },
  mobile: { title: 490, desc: 870 },
} as const;

/**
 * Calculates pixel width for standard Arial SERP title font
 */
export function estimateTitlePixelWidth(text: string): number {
  if (!text) return 0;
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (/[WMQ@]/.test(char)) {
      width += 15.5;
    } else if (/[A-Z%#&]/.test(char)) {
      width += 11.5;
    } else if (/[iljt1r.,:;!]/.test(char)) {
      width += 4.5;
    } else if (/[fkt ]/.test(char)) {
      width += 6.5;
    } else {
      width += 9.0;
    }
  }
  return width;
}

/**
 * Truncates title to fit within Google's pixel limit without breaking mid-word when possible
 */
export function truncateTitleByPixels(title: string, maxPixels = SERP_LIMITS.desktop.title): string {
  if (estimateTitlePixelWidth(title) <= maxPixels) {
    return title;
  }

  let lo = 0;
  let hi = title.length;
  let best = title;

  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = title.slice(0, mid) + '...';
    if (estimateTitlePixelWidth(candidate) <= maxPixels) {
      best = candidate;
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  return best;
}

/**
 * Truncates meta description by sentence/word boundary to fit within snippet limit
 */
export function truncateDescription(desc: string, maxChars = 158): string {
  if (!desc || desc.length <= maxChars) return desc;
  const cut = desc.substring(0, maxChars - 3);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > 100) {
    return cut.substring(0, lastSpace).trim() + '...';
  }
  return cut.trim() + '...';
}
