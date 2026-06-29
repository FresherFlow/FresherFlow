import { Page } from 'playwright';

// Clean common ATS suffixes from the scraped title
export function cleanAtsTitle(rawTitle: string): string {
    let title = rawTitle;
    const suffixes = [
        /\s*-\s*Workday\s*$/i,
        /\s*\|\s*Career Pages\s*$/i,
        /\s*-\s*SmartRecruiters\s*$/i,
        /\s*-\s*Taleo\s*$/i,
        /\s*-\s*Job Details\s*$/i,
        /\s*-\s*Careers\s*$/i,
        /\s*\|\s*Careers\s*$/i,
    ];
    for (const s of suffixes) {
        title = title.replace(s, '');
    }
    return title.trim();
}

// Apply stealth settings to page
export async function applyStealth(page: Page): Promise<void> {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
}

// Extract page text, html, and title using Playwright
export async function extractAtsContent(page: Page, url: string): Promise<{ title: string; text: string; html: string }> {
    try {
        console.log(`Loading job page: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(10000); // Let content settle / SPA render

        // Extract body text, html, and title
        const bodyText = await page.locator('body').innerText().catch(() => "");
        const bodyHtml = await page.locator('body').innerHTML().catch(() => "");
        const rawTitle = await page.title().catch(() => "");
        
        return {
            title: cleanAtsTitle(rawTitle),
            text: bodyText.trim(),
            html: bodyHtml.trim()
        };
    } catch (err) {
        console.error(`Failed to load/extract ATS content for ${url}:`, (err as Error).message);
        return { title: "", text: "", html: "" };
    }
}

// Check for bot detection, 404 error pages, or empty page
export function isBotOrError(text: string, title: string): boolean {
    const textLower = text.toLowerCase();
    const titleLower = title.toLowerCase();
    return textLower.includes('cloudflare') || 
           textLower.includes('enable javascript') ||
           textLower.includes('security check') ||
           titleLower.includes('page not found') ||
           titleLower.includes('404') ||
           titleLower.includes('client error') ||
           titleLower.includes('error 404') ||
           titleLower.includes('access denied') ||
           textLower.includes('page no longer exists') ||
           textLower.includes('job position is no longer online');
}

/**
 * Pre-clean and cap text before sending to LLM.
 * Strips navigation noise and limits to maxChars (default 4000).
 * This cuts token usage by 50-70% on typical ATS pages.
 */
export function trimForLlm(text: string, maxChars = 4000): string {
    // 1. Remove lines that are clearly nav/footer noise (short menu items)
    const lines = text.split('\n');
    const meaningful = lines.filter(line => {
        const t = line.trim();
        if (t.length === 0) return false;
        // Skip very short lines that are nav items / breadcrumbs
        if (t.length < 4) return false;
        // Skip lines that are just icons or single words that look like nav
        if (/^(home|menu|skip|search|login|sign in|sign up|cookie|privacy|terms|back|next|prev|share|save|apply now|print|close|×|✕)$/i.test(t)) return false;
        return true;
    });

    // 2. Collapse repeated blank lines
    let cleaned = meaningful.join('\n').replace(/\n{3,}/g, '\n\n').trim();

    // 3. Cap to maxChars — prefer cutting from the bottom (footers)
    if (cleaned.length > maxChars) {
        cleaned = cleaned.slice(0, maxChars);
        // Don't cut mid-word
        const lastSpace = cleaned.lastIndexOf(' ');
        if (lastSpace > maxChars - 200) cleaned = cleaned.slice(0, lastSpace);
    }

    return cleaned;
}

