import { useState, useEffect } from 'react';

export interface LinkPreviewData {
    title: string | null;
    image: string | null;
    description: string | null;
    domain: string | null;
}

const cache: Record<string, LinkPreviewData> = {};

export function useLinkPreview(url: string | null | undefined) {
    const [data, setData] = useState<LinkPreviewData | null>(() => {
        if (url && cache[url]) {
            return cache[url];
        }
        return null;
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!url || !url.startsWith('http')) {
            setData(null);
            return;
        }

        if (cache[url]) {
            setData(cache[url]);
            return;
        }

        let isMounted = true;
        setLoading(true);

        const fetchPreview = async () => {
            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'WhatsApp/2.21.12.21 A', // Masquerade to get rich tags easily
                        'Accept': 'text/html'
                    }
                });
                
                if (!response.ok) throw new Error('Failed to fetch');
                const html = await response.text();

                const getMetaTag = (html: string, property: string) => {
                    const match = html.match(new RegExp(`<meta(?:\\s+[a-zA-Z0-9-]+=(?:"[^"]*"|'[^']*'|[^\\s>]+))*\\s+(?:property|name)=["']?${property}["']?\\s+content=["']?([^"'>]+)["']?`, 'i')) || 
                                  html.match(new RegExp(`<meta(?:\\s+[a-zA-Z0-9-]+=(?:"[^"]*"|'[^']*'|[^\\s>]+))*\\s+content=["']?([^"'>]+)["']?\\s+(?:property|name)=["']?${property}["']?`, 'i'));
                    return match ? match[1] : null;
                };

                const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
                
                let title = getMetaTag(html, 'og:title') || getMetaTag(html, 'twitter:title') || (titleMatch ? titleMatch[1] : null);
                let image = getMetaTag(html, 'og:image') || getMetaTag(html, 'twitter:image');
                let description = getMetaTag(html, 'og:description') || getMetaTag(html, 'description');

                // Decode HTML entities roughly
                if (title) title = title.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
                if (description) description = description.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();

                // Fix relative image URLs
                if (image && image.startsWith('/')) {
                    try {
                        const urlObj = new URL(url);
                        image = `${urlObj.protocol}//${urlObj.host}${image}`;
                    } catch {}
                }

                let domain = null;
                try {
                    const urlObj = new URL(url);
                    domain = urlObj.hostname.replace('www.', '');
                } catch {}

                const previewData = { title, image, description, domain };
                
                if (isMounted) {
                    cache[url] = previewData;
                    setData(previewData);
                    setLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    // Fallback to domain
                    let domain = null;
                    try {
                        domain = new URL(url).hostname.replace('www.', '');
                    } catch {}
                    
                    const fallbackData = { title: null, image: null, description: null, domain };
                    cache[url] = fallbackData;
                    setData(fallbackData);
                    setLoading(false);
                }
            }
        };

        void fetchPreview();

        return () => {
            isMounted = false;
        };
    }, [url]);

    return { data, loading };
}
