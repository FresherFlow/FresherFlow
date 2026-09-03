import TurndownService from 'turndown';

const turndownService = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced'
});

// Custom heading rule: output **Heading** per docs/templates.md
turndownService.addRule('bold-headings', {
    filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    replacement: function (content: string) {
        const cleanContent = content.replace(/^\*\*|\*\*$/g, '').trim();
        if (!cleanContent) return '';
        return `\n\n**${cleanContent}**\n\n`;
    }
});

// Strip image elements completely
turndownService.addRule('strip-images', {
    filter: function (node: any) {
        const tag = (node.tagName || '').toLowerCase();
        return ['img', 'svg', 'picture'].includes(tag);
    },
    replacement: function () {
        return '';
    }
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
        if (['nav', 'header', 'footer', 'aside', 'script', 'style', 'noscript', 'form', 'iframe', 'svg', 'img', 'hr'].includes(tag)) return true;

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

    // Split text by newlines and filter out lines containing specific clickbait/disclaimer/noise substrings
    const lines = clean.split('\n');
    const filteredLines = lines.filter(line => {
        // Strip "Join our WhatsApp/Telegram" lines
        if (/Join our (?:WhatsApp|Telegram)/i.test(line)) {
            return false;
        }
        // Strip disclaimer boilerplate
        if (/(?:Important Disclaimer|The information provided is for informational purposes|Latest MNC Jobs|Govt Job Mart|WPFriendship|Powered by WordPress)/i.test(line)) {
            return false;
        }
        if (/All recruitment details are sourced directly from the official website/i.test(line)) {
            return false;
        }
        // Strip "© Copyright" footer lines
        if (/©/i.test(line) && /Copyright/i.test(line)) {
            return false;
        }
        // Strip "Save my name, email..." cookie notice
        if (/Save my name, email/i.test(line) && /browser/i.test(line)) {
            return false;
        }
        return true;
    });
    clean = filteredLines.join('\n');

    // Strip "How to Apply" lines and nearby links
    const htaIndex = clean.toLowerCase().indexOf('how to apply');
    if (htaIndex !== -1) {
        const windowSize = 200;
        const substring = clean.slice(htaIndex, htaIndex + windowSize);
        const urlMatch = substring.match(/(?:\[[^\]]+\]\([^)]+\)|https?:\/\/\S+)/i);
        if (urlMatch && urlMatch.index !== undefined) {
            const urlEnd = htaIndex + urlMatch.index + urlMatch[0].length;
            clean = clean.slice(0, htaIndex) + clean.slice(urlEnd);
        }
    }

    // Strip "Posted in" / "Published by admin" lines (aggregator category tags)
    clean = clean.replace(/^Posted in .*$/gmi, '');
    clean = clean.replace(/^Published by .*$/gmi, '');

    // Strip "Leave a Reply" comment form sections
    clean = clean.replace(/Leave a Reply[\s\S]{0,500}?required fields are marked/gi, '');

    // Strip lines that look like phone country code lists ("+93", "+44 Åland Islands", etc.)
    clean = clean.replace(/^[ \t*-]*[A-Za-zÀ-ÿ&][A-Za-zÀ-ÿ \t&]* \+\d+\s*$/gm, '');

    // Strip "Post navigation", "Prev/Next" breadcrumbs
    clean = clean.replace(/^(Post navigation|Prev |Next ).*$/gmi, '');

    // Strip lines that are just nav/form labels
    clean = clean.replace(/^(First Name|Last Name|Email|Phone|Website|Comment|Search|Name)\s*\*?\s*$/gmi, '');

    // Strip window.ENV / JSON blobs injected into page text
    clean = clean.replace(/window\.ENV\s*=\s*\{[\s\S]*?\}/g, '');

    // Strip equal opportunity and disability boilerplate
    clean = clean.replace(/(?:Equal Opportunity Employer|We are an equal opportunity employer|EEO Statement|Accommodations are available|Diversity and Inclusion|Privacy Policy)[\s\S]*$/i, '');

    // Convert any remaining #, ##, ### headers to **Heading**
    clean = clean.replace(/^#{1,6}\s*(.+)$/gm, (match, heading) => {
        const cleanH = heading.replace(/^\*\*|\*\*$/g, '').trim();
        return `\n\n**${cleanH}**\n\n`;
    });

    // Convert === or --- underline headers to **Heading**
    clean = clean.replace(/^([^\n]+)\n(=+|-{3,})$/gm, (match, heading) => {
        const cleanH = heading.replace(/^\*\*|\*\*$/g, '').trim();
        return `\n\n**${cleanH}**\n\n`;
    });

    // Strip standalone === or --- dividers
    clean = clean.replace(/^(=+|-{3,})$/gm, '');

    // Convert * or • bullets to - bullets
    clean = clean.replace(/^[\s]*[\*•]\s+/gm, '- ');

    // Strip any lingering markdown images
    clean = clean.replace(/!\[.*?\]\(.*?\)/g, '');

    // Strip Internshala-style markdown links: [Text](/company/...) or [Text](/static/...)
    clean = clean.replace(/\[([^\]]+)\]\(\/company\/[^)]+\)/g, '$1');
    clean = clean.replace(/\[([^\]]*)\]\(\/static\/[^)]+\)/g, '');
    clean = clean.replace(/\[([^\]]*)\]\(https?:\/\/wa\.me\/[^)]+\)/g, '');
    clean = clean.replace(/\[([^\]]*)\]\(https?:\/\/internshala\.com\/[^)]+\)/g, '');

    // Strip Internshala metadata lines
    clean = clean.replace(/^\s*(?:Start Date|Duration|Stipend|APPLY BY|Posted|Internship|Fresher Job|\d+ applicants)\s.*$/gmi, '');
    clean = clean.replace(/^\s*Be an early applicant\s*$/gmi, '');
    clean = clean.replace(/^\s*Internship !\s*$/gmi, '');

    // Collapse excessive blank lines
    clean = clean.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n');

    return clean.trim();
}

/**
 * Converts HTML to clean Markdown, stripping nav/footer/form noise first.
 */
export default function parseHtmlToMarkdown(html: string): string {
    if (!html) return '';
    // 1. Convert HTML to Markdown (Turndown strips noise elements via rules)
    const rawMarkdown = turndownService.turndown(html);
    
    // 2. Clean up remaining text-level noise and format to templates.md
    const cleanMarkdown = cleanClickbait(rawMarkdown);
    
    return cleanMarkdown;
}

// Also export the named function
export { parseHtmlToMarkdown };
