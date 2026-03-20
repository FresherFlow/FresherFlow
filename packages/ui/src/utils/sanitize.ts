import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string): string {
    if (typeof window === 'undefined') {
        // Simple fallback for server-side if needed, but this app is mostly client-side
        return html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '');
    }
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    });
}
