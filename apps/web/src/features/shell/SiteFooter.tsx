import Link from 'next/link';
import type React from 'react';
import { APP_LINKS, APP_LINKS as LINKS } from '@/lib/config/links';
import {
    TelegramBrandIcon,
    WhatsAppBrandIcon,
    LinkedInBrandIcon,
    XBrandIcon,
    DiscordBrandIcon,
    InstagramBrandIcon,
    FacebookBrandIcon,
} from '@/features/navigation/SocialSidebar';

/**
 * Site footer — the app-wide footer (not a landing-only component).
 *
 * COLOR RULE (locked): near-black #070a10 — same always-dark approach as
 * the landing stat band (literal hex, identical in light AND dark mode).
 * The statement band above it is light, so the seam is high-contrast.
 *
 * SOCIAL RULE (locked): right rail, vertical, icon + name per line,
 * left-aligned. GitHub included.
 *
 * LEFT  — logo + wordmark + tagline, hairline, five bold-header columns
 * RIGHT — socials vertical (icon + name), © once on the bottom line
 */

import { LogoImage } from '@/features/shell/LogoImage';

function GitHubIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
    );
}

const GROUPS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
    {
        title: 'Boards',
        links: [
            { label: 'Off-Campus Jobs', href: '/jobs' },
            { label: 'Internships', href: '/jobs/internships' },
            { label: 'Walk-in Drives', href: '/jobs/walkins' },
            { label: 'Government', href: '/govt' },
        ],
    },
    {
        title: 'Community',
        links: [
            { label: 'Post an opportunity', href: '/post' },
            { label: 'Discussions', href: '/discussions' },
            { label: 'Contributors', href: '/u' },
        ],
    },
    {
        title: 'Explore',
        links: [
            { label: 'Companies', href: '/companies' },
            { label: 'Deadlines', href: '/deadlines' },
            { label: 'Resources', href: '/resources' },
        ],
    },
    {
        title: 'Company',
        links: [
            { label: 'About', href: '/about' },
            { label: 'Blog', href: '/blog' },
            { label: 'Contact', href: '/contact' },
        ],
    },
    {
        title: 'Legal',
        links: [
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Service', href: '/terms' },
        ],
    },
];

const SOCIALS: Array<{ label: string; Icon: (p: { className?: string }) => React.ReactElement; href: string }> = [
    { label: 'GitHub', Icon: GitHubIcon, href: 'https://github.com/MukeshCheekatla/FresherFlow' },
    { label: 'X / Twitter', Icon: XBrandIcon, href: APP_LINKS.x },
    { label: 'LinkedIn', Icon: LinkedInBrandIcon, href: APP_LINKS.linkedin },
    { label: 'Instagram', Icon: InstagramBrandIcon, href: APP_LINKS.instagram },
    { label: 'Telegram', Icon: TelegramBrandIcon, href: APP_LINKS.telegram },
    { label: 'WhatsApp', Icon: WhatsAppBrandIcon, href: APP_LINKS.whatsapp },
    { label: 'Discord', Icon: DiscordBrandIcon, href: APP_LINKS.discord },
    { label: 'Facebook', Icon: FacebookBrandIcon, href: APP_LINKS.facebook },
];

export function SiteFooter() {
    return (
        <footer className="bg-background text-foreground">
            <div className="mx-auto w-full max-w-7xl px-6 pb-8 pt-14">
                <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
                    {/* LEFT — brand + link columns */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                            <LogoImage width={32} height={32} className="h-8 w-8" />
                            <span className="font-display text-2xl font-extrabold leading-none tracking-tight">
                                FresherFlow
                            </span>
                        </div>
                        <p className="mt-3 font-record text-xs tracking-widest text-muted-foreground">
                            JOBS, POWERED BY FRESHERS.
                        </p>

                        <div className="my-8 h-px bg-border" aria-hidden />

                        <div className="flex flex-wrap gap-x-12 gap-y-10">
                            {GROUPS.map((g) => (
                                <div key={g.title}>
                                    <div className="text-sm font-bold text-foreground">{g.title}</div>
                                    <ul className="mt-4 flex flex-col gap-2.5">
                                        {g.links.map((l) => (
                                            <li key={l.href + l.label}>
                                                <Link
                                                    href={l.href}
                                                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                                                >
                                                    {l.label}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT — same rail, same spot: socials VERTICAL, icon + name per line */}
                    <div className="flex w-full shrink-0 flex-col border-border lg:w-75 lg:border-l lg:pl-10">
                        <nav aria-label="Social links" className="flex flex-col items-start gap-3">
                            {SOCIALS.map(({ label, Icon, href }) => (
                                <a
                                    key={label}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    <Icon className="h-4.5 w-4.5" />
                                    <span className="font-record text-xs">{label}</span>
                                </a>
                            ))}
                        </nav>

                    </div>
                </div>

                {/* bottom line — EST + MADE IN INDIA, © (single occurrence) */}
                <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 font-record text-xs tracking-widest text-muted-foreground">
                    <span>EST. 2026 · MADE IN INDIA</span>
                    <span>© 2026 FresherFlow</span>
                </div>
            </div>
        </footer>
    );
}
