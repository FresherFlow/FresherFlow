import DOMPurify from 'dompurify';

function escapeHtml(value: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;'
    };
    return value.replace(/[&<>"']/g, m => map[m]);
}

function applyInlineFormatting(value: string): string {
    return escapeHtml(value)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function formatPlainTextDescription(input: string): string {
    const normalized = input
        .replace(/\r\n/g, '\n')
        .replace(/\\n/g, '\n')
        .trim();

    if (!normalized) return '';

    const lines = normalized.split('\n');
    const parts: string[] = [];
    let paragraphBuffer: string[] = [];
    let listBuffer: string[] = [];

    const flushParagraph = () => {
        if (paragraphBuffer.length === 0) return;
        parts.push(`<p>${paragraphBuffer.map(applyInlineFormatting).join('<br />')}</p>`);
        paragraphBuffer = [];
    };

    const flushList = () => {
        if (listBuffer.length === 0) return;
        parts.push(`<ul>${listBuffer.map((item) => `<li>${applyInlineFormatting(item)}</li>`).join('')}</ul>`);
        listBuffer = [];
    };

    for (const rawLine of lines) {
        const line = rawLine.trim();

        if (!line) {
            flushParagraph();
            flushList();
            continue;
        }

        const bulletMatch = line.match(/^[-*]\s+(.+)$/);
        if (bulletMatch) {
            flushParagraph();
            listBuffer.push(bulletMatch[1].trim());
            continue;
        }

        const headingMatch = line.match(/^\*\*(.+?)\*\*:?$/);
        if (headingMatch) {
            flushParagraph();
            flushList();
            parts.push(`<h4>${applyInlineFormatting(headingMatch[1].trim())}</h4>`);
            continue;
        }

        const colonHeading = line.endsWith(':') && line.length <= 80 && !line.includes('.')
            ? line.slice(0, -1).trim()
            : '';
        if (colonHeading) {
            flushParagraph();
            flushList();
            parts.push(`<h4>${applyInlineFormatting(colonHeading)}</h4>`);
            continue;
        }

        flushList();
        paragraphBuffer.push(line);
    }

    flushParagraph();
    flushList();

    return parts.join('');
}

export function sanitizeHtml(html: string | null | undefined): string {
    if (!html) return '';
    const formattedHtml = /<[a-z][\s\S]*>/i.test(html) ? html : formatPlainTextDescription(html);

    if (typeof window === 'undefined') {
        const allowed = new Set(['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div']);
        return formattedHtml.replace(/<(\/?)([a-z0-9]+)([^>]*)>/gi, (match, close, tag, attrs) => {
            const lowerTag = tag.toLowerCase();
            if (allowed.has(lowerTag)) return `<${close}${lowerTag}>`;
            if (lowerTag === 'a') {
                const hrefMatch = attrs.match(/href\s*=\s*(['"])(https?:\/\/[^'"]+)\1/i);
                if (hrefMatch) return `<${close}a href=${hrefMatch[1]}${hrefMatch[2]}${hrefMatch[1]}>`;
                return `<${close}a>`;
            }
            return `&lt;${close}${tag}${attrs}&gt;`;
        });
    }
    return DOMPurify.sanitize(formattedHtml, {
        ALLOWED_TAGS: [
            'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    });
}
