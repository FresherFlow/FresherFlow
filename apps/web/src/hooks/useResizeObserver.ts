'use client';

import { useEffect, useRef, useState } from 'react';

interface Size {
    width: number;
    height: number;
}

/**
 * Observes an element's size via ResizeObserver and returns its width/height.
 * Re-renders the consumer whenever the observed element is resized.
 */
export function useElementSize<T extends HTMLElement = HTMLDivElement>() {
    const ref = useRef<T | null>(null);
    const [size, setSize] = useState<Size>({ width: 0, height: 0 });

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const update = () => {
            const rect = node.getBoundingClientRect();
            setSize({ width: rect.width, height: rect.height });
        };

        update();

        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
        if (observer) {
            observer.observe(node);
        } else {
            window.addEventListener('resize', update);
        }

        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', update);
        };
    }, []);

    return { ref, ...size };
}
