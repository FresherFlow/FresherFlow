import TurndownService from 'turndown';

const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
});

// Strip unwanted HTML elements before Turndown sees them
turndownService.addRule('strip-noise-elements', {
    filter: function (node: HTMLElement) {
        if (node.nodeType !== 1) return false;
        const el = node as HTMLElement;
        const tag = el.tagName?.toLowerCase() || '';
        const cls = (el.getAttribute('class') || '').toLowerCase();
        const id = (el.getAttribute('id') || '').toLowerCase();

        // Strip by tag
        if (['nav', 'header', 'footer', 'aside', 'script', 'style', 'noscript', 'form', 'iframe', 'svg', 'img'].includes(tag)) return true;

        // Strip by class/id patterns
        if (
            cls.includes('apply-button') ||
            cls.includes('social-share') ||
            cls.includes('cookie') ||
            cls.includes('banner') ||
            cls.includes('similar-jobs') ||
            cls.includes('related-jobs') ||
            cls.includes('talent-community') ||
            cls.includes('newsletter') ||
            cls.includes('breadcrumb') ||
            cls.includes('pagination') ||
            cls.includes('sidebar') ||
            id.includes('cookie') ||
            id.includes('consent') ||
            id.includes('banner')
        ) return true;

        return false;
    },
    replacement: function () {
        return '';
    }
});

/**
 * Aggressively strips clickbait and noise from markdown text.
 */
export function cleanClickbait(markdown: string): string {
    let clean = markdown;

    // Strip "Join our WhatsApp/Telegram" lines
    clean = clean.replace(/^.*Join our (WhatsApp|Telegram).*$/gmi, '');

    // Strip "How to Apply" lines and nearby links
    clean = clean.replace(/#*\s*How to Apply[\s\S]{0,150}?(?:\[[^\]]+\]\([^)]+\)|https?:\/\/\S+)/gi, '');

    // Strip disclaimer boilerplate
    clean = clean.replace(/^.*(?:Important Disclaimer|The information provided is for informational purposes|Latest MNC Jobs|Govt Job Mart|WPFriendship|Powered by WordPress).*$/gmi, '');
    clean = clean.replace(/^.*All recruitment details are sourced directly from the official website.*$/gmi, '');

    // Strip "© Copyright" footer lines
    clean = clean.replace(/^.*©.*Copyright.*$/gmi, '');

    // Strip "Posted in" / "Published by admin" lines (aggregator category tags)
    clean = clean.replace(/^Posted in .*$/gmi, '');
    clean = clean.replace(/^Published by .*$/gmi, '');

    // Strip "Leave a Reply" comment form sections
    clean = clean.replace(/Leave a Reply[\s\S]{0,500}?required fields are marked/gi, '');

    // Strip lines that look like phone country code lists ("+93", "+44 Åland Islands", etc.)
    clean = clean.replace(/^[\s*-]*[A-Za-zÀ-ÿ\s&]+ \+\d+\s*$/gm, '');

    // Strip "Post navigation", "Prev/Next" breadcrumbs
    clean = clean.replace(/^(Post navigation|Prev |Next ).*$/gmi, '');

    // Strip "Save my name, email..." cookie notice
    clean = clean.replace(/^.*Save my name, email.*browser.*$/gmi, '');

    // Strip lines that are just nav/form labels
    clean = clean.replace(/^(First Name|Last Name|Email|Phone|Website|Comment|Search|Name)\s*\*?\s*$/gmi, '');

    // Strip window.ENV / JSON blobs injected into page text
    clean = clean.replace(/window\.ENV\s*=\s*\{[\s\S]*?\}/g, '');

    // Collapse excessive blank lines
    clean = clean.replace(/\n{3,}/g, '\n\n');

    return clean.trim();
}

/**
 * Converts HTML to clean Markdown, stripping nav/footer/form noise first.
 */
export default function parseHtmlToMarkdown(html: string): string {
    // 1. Convert HTML to Markdown (Turndown strips noise elements via rules)
    const rawMarkdown = turndownService.turndown(html);
    
    // 2. Clean up remaining text-level noise
    const cleanMarkdown = cleanClickbait(rawMarkdown);
    
    return cleanMarkdown;
}

// Also export the named function
export { parseHtmlToMarkdown };
