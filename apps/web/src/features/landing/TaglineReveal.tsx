'use client';

import { useEffect, useRef } from 'react';

/**
 * The tagline reveal — the page's one scroll moment.
 *
 * Each word starts muted and lights up individually as it crosses the
 * trigger line, in reading order, on the base curve. One IntersectionObserver
 * drives the sequence and then unobserves. With prefers-reduced-motion the
 * line renders at full colour immediately.
 */
const TEXT = 'Find the right opportunity without the noise.';

export function TaglineReveal() {
    const sectionRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const section = sectionRef.current;
        if (!section) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const words = Array.from(section.querySelectorAll<HTMLElement>('.tagline-word'));
        if (words.length === 0) return;
        section.classList.add('tagline-armed');

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    words.forEach((word, idx) => {
                        window.setTimeout(() => word.classList.add('is-on'), idx * 60);
                    });
                    observer.unobserve(section);
                });
            },
            { threshold: 0.5 }
        );

        observer.observe(section);
        return () => {
            observer.disconnect();
            section.classList.remove('tagline-armed');
        };
    }, []);

    return (
        <section ref={sectionRef} className="border-b border-border" aria-label="FresherFlow promise">
            <div className="mx-auto max-w-[1200px] px-5 sm:px-8 py-14 sm:py-28">
                <h2 className="ff-h1 font-display mx-auto max-w-[680px] text-center">
                    {TEXT.split(' ').map((word, idx) => (
                        <span key={idx} className="tagline-word">
                            {word}
                        </span>
                    ))}
                </h2>
            </div>
        </section>
    );
}
