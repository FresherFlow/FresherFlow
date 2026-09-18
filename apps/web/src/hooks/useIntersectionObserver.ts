import { useEffect, useState, useCallback } from 'react';

export function useIntersectionObserver(options: IntersectionObserverInit = {}) {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const [target, setTarget] = useState<HTMLElement | null>(null);

    const targetRef = useCallback((node: HTMLElement | null) => {
        setTarget(node);
    }, []);

    useEffect(() => {
        if (!target) {
            setIsIntersecting(false);
            return;
        }

        const observer = new IntersectionObserver(([entry]) => {
            setIsIntersecting(entry?.isIntersecting ?? false);
        }, options);

        observer.observe(target);
        return () => {
            observer.disconnect();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target, options.root, options.rootMargin, options.threshold]);

    return { targetRef, isIntersecting };
}
