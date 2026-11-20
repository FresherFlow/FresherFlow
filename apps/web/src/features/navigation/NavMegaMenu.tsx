'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import type { Opportunity } from '@fresherflow/types';
import { slugify } from '@fresherflow/utils/slugify';
import { VALID_LOCATIONS, getCanonicalLocation } from '@/features/jobs/utils/locationUtils';
import { CURATED_ROLE_KEYWORDS } from '@/features/jobs/domain/taxonomy';
import { cn } from '@/ui/cn';

/** A conventional column mega-menu. Directory links come from the live feed. */

type Item = { slug: string; label: string };
type Groups = { locations: Item[]; skills: Item[]; batches: Item[]; roles: Item[] };
const EMPTY: Groups = { locations: [], skills: [], batches: [], roles: [] };

const EXPLORE = [
    { label: 'All jobs', href: '/jobs' },
    { label: 'Internships', href: '/jobs/internships' },
    { label: 'Full-time', href: '/jobs/full-time' },
    { label: 'Part-time', href: '/jobs/part-time' },
    { label: 'Remote / WFH', href: '/jobs/remote' },
    { label: 'Walk-in drives', href: '/drives/walk-in' },
    { label: 'Government jobs', href: '/govt' },
];

function useFeedGroups(): Groups {
    const [groups, setGroups] = useState<Groups>(EMPTY);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/public/feed')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (cancelled || !data || !Array.isArray(data.opportunities)) return;
                const opps = data.opportunities as Opportunity[];
                const cities = new Map<string, number>();
                const skills = new Map<string, number>();
                const years = new Map<number, number>();

                for (const opp of opps) {
                    const seen = new Set<string>();
                    for (const loc of opp.locations || []) {
                        const canonical = getCanonicalLocation(loc);
                        if (canonical && !seen.has(canonical)) {
                            seen.add(canonical);
                            cities.set(canonical, (cities.get(canonical) ?? 0) + 1);
                        }
                    }
                    for (const skill of opp.requiredSkills || []) {
                        const slug = slugify(skill);
                        if (slug) skills.set(slug, (skills.get(slug) ?? 0) + 1);
                    }
                    for (const year of opp.allowedPassoutYears || []) {
                        const y = Number(year);
                        if (Number.isFinite(y)) years.set(y, (years.get(y) ?? 0) + 1);
                    }
                }

                const top = (map: Map<string, number>, limit: number) =>
                    [...map.entries()]
                        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                        .slice(0, limit)
                        .map(([slug]) => slug);
                const titleCase = (slug: string) =>
                    slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                setGroups({
                    locations: top(cities, 6).map((slug) => ({
                        slug,
                        label: VALID_LOCATIONS[slug as keyof typeof VALID_LOCATIONS]?.label ?? titleCase(slug),
                    })),
                    skills: top(skills, 6).map((slug) => ({ slug, label: titleCase(slug) })),
                    batches: [...years.entries()]
                        .sort((a, b) => b[0] - a[0])
                        .slice(0, 4)
                        .map(([year]) => ({ slug: String(year), label: `${year} Batch` })),
                    roles: Object.entries(CURATED_ROLE_KEYWORDS)
                        .map(([slug, info]) => ({
                            slug,
                            label: info.label,
                            count: opps.filter((o) =>
                                info.keywords.some((kw) => (o.title || '').toLowerCase().includes(kw))
                            ).length,
                        }))
                        .filter((r) => r.count > 0)
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5)
                        .map(({ slug, label }) => ({ slug, label })),
                });
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    return groups;
}

function Column({ title, links }: { title: string; links: { label: string; href: string }[] }) {
    if (links.length === 0) return null;
    return (
        <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
            <ul className="mt-3 flex flex-col gap-0.5">
                {links.map((link) => (
                    <li key={link.href}>
                        <Link
                            href={link.href}
                            className="block rounded-md px-2 py-1.5 text-sm text-foreground transition-colors duration-150 ease-out hover:bg-muted hover:text-primary"
                        >
                            {link.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function NavMegaMenu({ isLanding: _isLanding, marqueeHidden: _marqueeHidden }: {
    isLanding: boolean;
    marqueeHidden: boolean;
}) {
    const [open, setOpen] = useState(false);
    const groups = useFeedGroups();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [panelTop, setPanelTop] = useState(64);

    // The header clips absolute children, so the panel is fixed. Place it just
    // below the trigger; the pseudo element above the panel covers the gap so
    // moving the pointer from trigger to panel never leaves the hover area.
    useEffect(() => {
        const measure = () => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (rect) setPanelTop(rect.bottom);
        };
        measure();
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, { passive: true });
        return () => {
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure);
        };
    }, []);

    return (
        <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <button
                ref={triggerRef}
                type="button"
                aria-expanded={open}
                aria-haspopup="true"
                onClick={() => setOpen((v) => !v)}
                onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
                className={cn(
                    'inline-flex items-center gap-1 px-2.5 md:px-3 py-1.5 text-xs md:text-sm font-medium whitespace-nowrap rounded transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    open ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
            >
                Browse
                <ChevronDownIcon className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')} />
            </button>

            <div
                className={cn(
                    'fixed left-1/2 z-50 w-11/12 max-w-5xl -translate-x-1/2',
                    'rounded-lg border border-border bg-card p-6 shadow-lg shadow-black/10 transition duration-150 ease-out',
                    open ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
                )}
                style={{ top: panelTop }}
            >
                {/* Bridges the gap so moving from trigger to panel never leaves hover. */}
                <div className="absolute inset-x-0 -top-3 h-3" aria-hidden="true" />
                <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
                    <Column title="Explore" links={EXPLORE} />
                    <Column
                        title="Locations"
                        links={groups.locations.map((i) => ({ label: i.label, href: `/jobs/${i.slug}-jobs` }))}
                    />
                    <Column
                        title="Skills"
                        links={groups.skills.map((i) => ({ label: i.label, href: `/jobs/${i.slug}-jobs` }))}
                    />
                    <Column
                        title="Batches"
                        links={groups.batches.map((i) => ({ label: i.label, href: `/jobs/${i.slug}-batch` }))}
                    />
                    <Column
                        title="Roles"
                        links={groups.roles.map((i) => ({ label: i.label, href: `/jobs/${i.slug}-jobs` }))}
                    />
                </div>
                <div className="mt-5 border-t border-border pt-4">
                    <Link href="/jobs/browse" className="text-sm font-semibold text-foreground hover:text-primary">
                        Browse all opportunities
                    </Link>
                </div>
            </div>
        </div>
    );
}
