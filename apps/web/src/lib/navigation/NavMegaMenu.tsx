'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

/**
 * Browse mega-menu — job-platform pattern.
 *
 * HOVER SAFETY: a transparent bridge pads the gap between the trigger and
 * the panel (so diagonal mouse travel never leaves the hover area), plus a
 * 150ms close delay. Open is instant; close is lazy.
 *
 * POSITIONING: the panel hangs below the header bar — never over it. On
 * landing there is a 28px marquee above the header at page top, so the
 * header sits at 28px; the panel tops at 28+60=88px there, else 64px. When
 * the marquee hides (scroll), `marqueeHidden` collapses the landing offset
 * to 60px so the panel follows the header up.
 *
 * LINKS: all canonical `/jobs/[slug]` registry boards.
 */

const BOARDS = [
    { label: 'Off-Campus Jobs', href: '/jobs', note: 'Every opening on the platform' },
    { label: 'Internships', href: '/jobs/internships', note: 'Intern roles for students' },
    { label: 'Walk-in Drives', href: '/jobs/walkins', note: 'Drives with dates & venues' },
    { label: 'Government', href: '/govt', note: 'Sarkari exams & notifications' },
    { label: 'Remote / WFH', href: '/jobs/remote', note: 'Work-from-home openings' },
];

const LOCATIONS = [
    { slug: 'bangalore', label: 'Bangalore' },
    { slug: 'hyderabad', label: 'Hyderabad' },
    { slug: 'pune', label: 'Pune' },
    { slug: 'chennai', label: 'Chennai' },
    { slug: 'mumbai', label: 'Mumbai' },
    { slug: 'delhi-ncr', label: 'Delhi NCR' },
];

const SKILLS = [
    { slug: 'react', label: 'React' },
    { slug: 'python', label: 'Python' },
    { slug: 'java', label: 'Java' },
    { slug: 'sql', label: 'SQL' },
    { slug: 'typescript', label: 'TypeScript' },
    { slug: 'node', label: 'Node' },
    { slug: 'aws', label: 'AWS' },
    { slug: 'flutter', label: 'Flutter' },
];

const BATCHES = [
    { slug: '2026-batch', label: '2026 Batch' },
    { slug: '2027-batch', label: '2027 Batch' },
    { slug: '2025-batch', label: '2025 Batch' },
    { slug: '2028-batch', label: '2028 Batch' },
];

const ROLES = [
    { slug: 'software-engineer', label: 'Software Engineer' },
    { slug: 'data-analyst', label: 'Data Analyst' },
    { slug: 'business-analyst', label: 'Business Analyst' },
    { slug: 'frontend-developer', label: 'Frontend Developer' },
    { slug: 'test-engineer', label: 'Test Engineer' },
];

export function NavMegaMenu({
    isLanding,
    marqueeHidden,
}: {
    isLanding: boolean;
    marqueeHidden: boolean;
}) {
    const [open, setOpen] = useState(false);
    const closeTimer = typeof window !== 'undefined' ? window.setTimeout : null;

    const openNow = () => {
        if (closeTimer) window.clearTimeout((NavMegaMenu as unknown as { _t?: number })._t);
        setOpen(true);
    };
    const closeSoon = () => {
        if (closeTimer) window.clearTimeout((NavMegaMenu as unknown as { _t?: number })._t);
        (NavMegaMenu as unknown as { _t?: number })._t = window.setTimeout(() => setOpen(false), 150);
    };

    // If the marquee hides while the menu is open, keep the menu pinned to the header
    useEffect(() => {
        const onScroll = () => {
            if (open) setOpen(true);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [open]);

    const close = () => {
        window.clearTimeout((NavMegaMenu as unknown as { _t?: number })._t);
        setOpen(false);
    };

    // Panel top: landing shows marquee (28px) + header (60px) = 88px at page top;
    // once the marquee hides the header rides to top-0, so 60px. Elsewhere 64px.
    const panelTop = isLanding ? (marqueeHidden ? 60 : 88) : 64;

    return (
        <div className="static" onMouseEnter={openNow} onMouseLeave={closeSoon}>
            <button
                type="button"
                aria-expanded={open}
                aria-haspopup="true"
                onClick={() => setOpen((v) => !v)}
                onKeyDown={(e) => e.key === 'Escape' && close()}
                className={`
                    inline-flex items-center gap-1 px-2.5 md:px-3 py-1.5 text-xs md:text-sm font-medium whitespace-nowrap
                    transition-colors duration-150 rounded relative
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                    ${open ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
                `}
            >
                Browse
                <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* hover bridge — invisible corridor from trigger to panel */}
            <div
                className={`fixed left-0 right-0 z-[94] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
                style={{ top: panelTop - 12, height: 12 }}
                aria-hidden
            />

            {/* Panel — flush under the header bar, never covering it */}
            <div
                className={`fixed left-0 right-0 z-[95] border-b border-border bg-background shadow-lg shadow-black/[0.06] transition-[opacity,transform] duration-150 ease-out ${
                    open ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
                }`}
                style={{ top: panelTop }}
            >
                <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-8 md:grid-cols-5">
                    {/* Boards */}
                    <div>
                        <div className="font-record text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            Boards
                        </div>
                        <ul className="mt-3 flex flex-col gap-1">
                            {BOARDS.map((b) => (
                                <li key={b.href}>
                                    <Link
                                        href={b.href}
                                        onClick={close}
                                        className="block rounded-[2px] px-2 py-1.5 transition-colors hover:bg-muted/60"
                                    >
                                        <div className="text-[13.5px] font-semibold text-foreground">{b.label}</div>
                                        <div className="text-[11.5px] text-muted-foreground">{b.note}</div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Locations — vertical list */}
                    <div>
                        <div className="font-record text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            Locations
                        </div>
                        <ul className="mt-3 flex flex-col gap-0.5">
                            {LOCATIONS.map((c) => (
                                <li key={c.slug}>
                                    <Link
                                        href={`/jobs/${c.slug}`}
                                        onClick={close}
                                        className="block rounded-[2px] px-2 py-1 text-[13px] text-foreground transition-colors hover:bg-muted/60 hover:text-[var(--ff-accent)]"
                                    >
                                        {c.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <Link
                            href="/jobs/browse"
                            onClick={close}
                            className="mt-3 inline-block text-[12px] font-semibold text-muted-foreground underline decoration-[var(--ff-accent)] decoration-2 underline-offset-4 transition-colors hover:text-foreground"
                        >
                            All locations →
                        </Link>
                    </div>

                    {/* Skills — vertical list */}
                    <div>
                        <div className="font-record text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            Top skills
                        </div>
                        <ul className="mt-3 flex flex-col gap-0.5">
                            {SKILLS.map((s) => (
                                <li key={s.slug}>
                                    <Link
                                        href={`/jobs/${s.slug}`}
                                        onClick={close}
                                        className="block rounded-[2px] px-2 py-1 text-[13px] text-foreground transition-colors hover:bg-muted/60 hover:text-[var(--ff-accent)]"
                                    >
                                        {s.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <Link
                            href="/jobs/browse"
                            onClick={close}
                            className="mt-3 inline-block text-[12px] font-semibold text-muted-foreground underline decoration-[var(--ff-accent)] decoration-2 underline-offset-4 transition-colors hover:text-foreground"
                        >
                            All skills →
                        </Link>
                    </div>

                    {/* Batches — one area, vertical */}
                    <div>
                        <div className="font-record text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            Batches
                        </div>
                        <ul className="mt-3 flex flex-col gap-0.5">
                            {BATCHES.map((b) => (
                                <li key={b.slug}>
                                    <Link
                                        href={`/jobs/${b.slug}`}
                                        onClick={close}
                                        className="block rounded-[2px] px-2 py-1 text-[13px] text-foreground transition-colors hover:bg-muted/60 hover:text-[var(--ff-accent)]"
                                    >
                                        {b.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <Link
                            href="/jobs/browse"
                            onClick={close}
                            className="mt-3 inline-block text-[12px] font-semibold text-muted-foreground underline decoration-[var(--ff-accent)] decoration-2 underline-offset-4 transition-colors hover:text-foreground"
                        >
                            All batches →
                        </Link>
                    </div>

                    {/* Roles */}
                    <div>
                        <div className="font-record text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            Popular roles
                        </div>
                        <ul className="mt-3 flex flex-col gap-0.5">
                            {ROLES.map((r) => (
                                <li key={r.slug}>
                                    <Link
                                        href={`/jobs/${r.slug}`}
                                        onClick={close}
                                        className="block rounded-[2px] px-2 py-1 text-[13px] text-foreground transition-colors hover:bg-muted/60 hover:text-[var(--ff-accent)]"
                                    >
                                        {r.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <Link
                            href="/jobs/browse"
                            onClick={close}
                            className="mt-3 inline-block text-[12px] font-semibold text-muted-foreground underline decoration-[var(--ff-accent)] decoration-2 underline-offset-4 transition-colors hover:text-foreground"
                        >
                            All roles →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
