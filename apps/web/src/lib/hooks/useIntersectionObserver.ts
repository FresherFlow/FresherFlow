import { useEffect, useRef, useState } from 'react';

export function useIntersectionObserver(options: IntersectionObserverInit = {}) {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const targetRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const target = targetRef.current;
        if (!target) return;

        const observer = new IntersectionObserver(([entry]) => {
            setIsIntersecting(entry.isIntersecting);
        }, options);

        observer.observe(target);
        return () => observer.disconnect();
    }, [options.root, options.rootMargin, options.threshold]);

    return { targetRef, isIntersecting };
}
