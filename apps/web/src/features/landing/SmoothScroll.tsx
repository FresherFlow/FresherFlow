'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Lenis smooth scrolling for the landing page (the standard on modern
 * marketing sites). Disabled entirely under prefers-reduced-motion.
 */
export function SmoothScroll() {
    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const lenis = new Lenis({
            duration: 1.2, // eased, not instant — the "expensive site" feel
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            touchMultiplier: 1.4,
        });

        // An unconditional rAF loop ran for the entire lifetime of the
        // landing page: a wakeup every frame even with no scroll in flight,
        // and continued while the tab was backgrounded. Gated on visibility
        // so a hidden tab costs nothing, and the loop is torn down on unmount.
        let raf = 0;
        let running = true;

        const loop = (time: number) => {
            lenis.raf(time);
            raf = requestAnimationFrame(loop);
        };
        const start = () => {
            if (running) return;
            running = true;
            raf = requestAnimationFrame(loop);
        };
        const stop = () => {
            if (!running) return;
            running = false;
            cancelAnimationFrame(raf);
        };

        const onVisibilityChange = () => {
            if (document.hidden) {
                stop();
                lenis.stop();
            } else {
                lenis.start();
                start();
            }
        };

        if (document.hidden) {
            running = false;
        } else {
            raf = requestAnimationFrame(loop);
        }
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            stop();
            document.removeEventListener('visibilitychange', onVisibilityChange);
            lenis.destroy();
        };
    }, []);

    return null;
}
