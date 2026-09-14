'use client';

import { useEffect, useState } from 'react';

/**
 * Scroll state for the landing header stack: the announcement marquee shows
 * ONLY at the top of the page. Once the user scrolls past 120px it hides and
 * STAYS hidden — scrolling back up mid-page does not bring it back; only
 * returning near the top does. The nav uses the same hook so it rides up to
 * top-0 the moment the marquee hides.
 */
export function useMarqueeHidden(enabled: boolean): boolean {
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        if (!enabled) {
            setHidden(false);
            return;
        }
        const onScroll = () => setHidden(window.scrollY > 120);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [enabled]);

    return hidden;
}
