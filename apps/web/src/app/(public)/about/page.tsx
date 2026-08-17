import type { Metadata } from 'next';
import Link from 'next/link';
import {
    ArrowUpRight,
    Globe,
    Smartphone,
    UserCheck,
    Code2,
    Send,
    MessageCircle,
    Mail,
    ArrowRight,
    LucideIcon,
} from 'lucide-react';

export const metadata: Metadata = {
    title: 'About FresherFlow | The Cleanest Path to Your First Job',
    description:
        'FresherFlow is an independent, community-driven platform created to give students, freshers, and early-career engineers across India direct, verified access to job opportunities.',
    alternates: {
        canonical: '/about',
    },
    openGraph: {
        title: 'About FresherFlow — The Cleanest Path to Your First Job',
        description:
            'Direct ATS links, verified walk-in drives, and zero spam for early-career job seekers across India.',
        url: 'https://fresherflow.in/about',
        type: 'website',
    },
};

type IconComponent = LucideIcon | (({ className }: { className?: string }) => React.JSX.Element);

function GithubBrandIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
    );
}

function LinkedinBrandIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5.001A2.5 2.5 0 0 1 4.98 3.5zM3 8.98h3.96V21H3V8.98zm7.02 0h3.8v1.64h.05c.53-1 1.82-2.06 3.75-2.06 4 0 4.74 2.64 4.74 6.08V21h-3.96v-5.6c0-1.34-.03-3.06-1.86-3.06-1.86 0-2.15 1.45-2.15 2.96V21h-3.97V8.98z" />
        </svg>
    );
}

function XBrandIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M18.9 2H22l-6.77 7.74L23 22h-6.17l-4.84-6.31L6.42 22H3.3l7.24-8.27L1 2h6.32l4.37 5.76L18.9 2zm-1.08 18h1.71L6.35 3.9H4.5L17.82 20z" />
        </svg>
    );
}

const metrics = [
    {
        value: '100%',
        label: 'Direct ATS Links',
        sub: 'Straight to official company career portals',
    },
    {
        value: '0 ₹',
        label: 'Candidate Fees',
        sub: 'Free forever with zero paywalled links',
    },
    {
        value: '0–2 YoE',
        label: 'True Freshers Filter',
        sub: 'Curated specifically for early-career roles',
    },
    {
        value: '2023–2027',
        label: 'Graduation Batches',
        sub: 'College students, interns & recent grads',
    },
] as const;

const principles = [
    {
        number: '01',
        title: 'Direct Source of Truth',
        description:
            'Every single opening on FresherFlow links straight to the employer’s authentic applicant tracking system (Workday, Greenhouse, Lever, SmartRecruiters) or official company domain. We never use intermediate link shorteners, ad-network redirects, or affiliate tracking loops.',
    },
    {
        number: '02',
        title: 'Zero Exploitation',
        description:
            'The entry-level job hunt in India is full of predatory consultancies demanding ₹5,000–₹25,000 for fake interview rounds. FresherFlow is 100% free forever for candidates. We strictly reject paid training packages, paid interview guarantees, and selling candidate data.',
    },
    {
        number: '03',
        title: 'Verified Walk-In Drives',
        description:
            'On-site hiring drives and pool campus events across Bengaluru, Hyderabad, Pune, Chennai, Noida, and other tech hubs are manually verified with confirmed dates, time slots, eligibility criteria, and exact venue addresses so you never travel in vain.',
    },
    {
        number: '04',
        title: 'Open & Community-Powered',
        description:
            'FresherFlow is built transparently with the community. Job listings are enriched with community-submitted tips and referrals, dead links are flagged and removed fast, and the core client apps are open source on GitHub.',
    },
] as const;

interface EcosystemItem {
    icon: LucideIcon;
    title: string;
    description: string;
    linkText: string;
    href: string;
    external?: boolean;
}

const ecosystem: EcosystemItem[] = [
    {
        icon: Globe,
        title: 'Web Platform',
        description:
            'A lightning-fast, keyboard-friendly web interface to search, filter by batch and tech stack, and track verified openings in real time.',
        linkText: 'Explore Web',
        href: '/',
        external: false,
    },
    {
        icon: Smartphone,
        title: 'Native Mobile App',
        description:
            'Built for Android and iOS with offline synchronization, instant drive notifications, and lightweight bookmarking on the go.',
        linkText: 'Download App',
        href: '/app',
        external: false,
    },
    {
        icon: UserCheck,
        title: 'Candidate Profiles (/u/)',
        description:
            'Public proof-of-work profiles where students can showcase verified GitHub repositories, live projects, and technical skills directly to recruiters.',
        linkText: 'Create Profile',
        href: '/profile',
        external: false,
    },
    {
        icon: Code2,
        title: 'Open Source Codebase',
        description:
            'Our public monorepo hosting our web application, native mobile apps, and documentation—open for community contributions.',
        linkText: 'View on GitHub',
        href: 'https://github.com/MukeshCheekatla/FresherFlow',
        external: true,
    },
];

interface CommunityChannel {
    name: string;
    description: string;
    href: string;
    icon: IconComponent;
    action: string;
}

const communityChannels: CommunityChannel[] = [
    {
        name: 'Telegram Channel',
        description: 'Instant job alerts and verified walk-in drive notices.',
        href: 'https://t.me/fresherflowin',
        icon: Send,
        action: 'Join Channel',
    },
    {
        name: 'WhatsApp Community',
        description: 'Curated daily job digests delivered straight to chat.',
        href: 'https://whatsapp.com/channel/0029VbCkZu6FHWq0qJOOU73D',
        icon: MessageCircle,
        action: 'Join Community',
    },
    {
        name: 'Discord Server',
        description: 'Discuss interview rounds, share prep tips, and network.',
        href: 'https://discord.gg/CcPAnWSHD',
        icon: MessageCircle,
        action: 'Join Discord',
    },
    {
        name: 'LinkedIn',
        description: 'Hiring announcements, partner updates, and trends.',
        href: 'https://www.linkedin.com/company/fresherflow-in',
        icon: LinkedinBrandIcon,
        action: 'Follow Us',
    },
    {
        name: 'GitHub',
        description: 'Star the repository, open issues, and contribute code.',
        href: 'https://github.com/MukeshCheekatla/FresherFlow',
        icon: GithubBrandIcon,
        action: 'View Repo',
    },
    {
        name: 'Direct Support',
        description: 'Feedback, bug reports, and listing corrections.',
        href: 'mailto:contact@fresherflow.in',
        icon: Mail,
        action: 'Email Us',
    },
];

const founderSocialLinks = [
    {
        label: 'LinkedIn',
        href: 'https://www.linkedin.com/in/Mukesh-Cheekatla',
        icon: LinkedinBrandIcon,
    },
    {
        label: 'GitHub',
        href: 'https://github.com/MukeshCheekatla',
        icon: GithubBrandIcon,
    },
    {
        label: 'X (Twitter)',
        href: 'https://x.com/mukeshdotdev',
        icon: XBrandIcon,
    },
] as const;

export default function AboutPage() {
    return (
        <div className="w-full bg-background text-foreground">
            {/* 1. Hero Section */}
            <section className="max-w-4xl mx-auto px-4 md:px-6 pt-10 pb-12 md:pt-16 md:pb-16">
                <div className="space-y-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border/80 text-foreground text-xs font-mono font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>About FresherFlow</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.12]">
                        We’re building the cleanest path to your first job.
                    </h1>

                    <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl">
                        FresherFlow is an independent, community-driven platform created to give students, freshers, and early-career engineers across India direct, verified access to job opportunities.
                    </p>
                </div>
            </section>

            {/* 2. Highlight Metrics Strip */}
            <section className="border-y border-border bg-muted/20">
                <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                        {metrics.map((item) => (
                            <div key={item.label} className="space-y-1">
                                <div className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono tracking-tight text-foreground">
                                    {item.value}
                                </div>
                                <div className="text-sm font-semibold text-foreground">
                                    {item.label}
                                </div>
                                <p className="text-xs text-muted-foreground leading-snug">
                                    {item.sub}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 3. The Origin & Problem (Story + Pull Quote) */}
            <section className="max-w-4xl mx-auto px-4 md:px-6 py-14 md:py-20 space-y-10">
                <div className="space-y-3">
                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">The Origin</p>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                        Why FresherFlow exists
                    </h2>
                </div>

                <div className="space-y-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
                    <p>
                        Every year, millions of college graduates in India begin the search for their first off-campus job. But instead of discovering transparent hiring processes, they run into an obstacle course designed to exploit their anxiety.
                    </p>
                    <p>
                        Unregulated consultancies pose as company recruiters, demanding anywhere from ₹5,000 to ₹25,000 as &quot;interview registration fees&quot;. WhatsApp and Telegram channels share clickbait links that bounce through five different ad redirects before landing on a 404 page. Mainstream job portals leave ghost listings active for months just to farm page views.
                    </p>
                </div>

                {/* Elegant Pull Quote */}
                <div className="my-6 p-6 sm:p-8 rounded-xl border border-border bg-muted/20 border-l-4 border-l-primary space-y-3">
                    <blockquote className="text-lg sm:text-xl font-medium text-foreground italic leading-relaxed">
                        &ldquo;Finding your first job should be about your skills, curiosity, and preparation—not how well you can navigate spam, paywalls, and fake placement traps.&rdquo;
                    </blockquote>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        — The FresherFlow Manifesto
                    </p>
                </div>

                <div className="space-y-6 text-base sm:text-lg text-muted-foreground leading-relaxed">
                    <p>
                        We started FresherFlow to build what we wished had existed when we were graduating: a noise-free, ad-free portal where every listing is active, relevant, and connected straight to the employer’s authentic hiring portal.
                    </p>
                </div>
            </section>

            {/* 4. Our Principles */}
            <section className="border-t border-border bg-muted/10">
                <div className="max-w-4xl mx-auto px-4 md:px-6 py-14 md:py-20 space-y-10">
                    <div className="space-y-3">
                        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Our Foundation</p>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            Our Operating Principles
                        </h2>
                        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                            Four core commitments that define every listing, feature, and architectural decision.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                        {principles.map((item) => (
                            <div key={item.number} className="space-y-2.5 border-l-2 border-primary/40 pl-5">
                                <div className="text-xs font-mono font-bold text-primary">
                                    {item.number}
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-foreground">
                                    {item.title}
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 5. The Platform Ecosystem */}
            <section className="border-t border-border">
                <div className="max-w-4xl mx-auto px-4 md:px-6 py-14 md:py-20 space-y-10">
                    <div className="space-y-3">
                        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Ecosystem</p>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            Built for modern job discovery
                        </h2>
                        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                            A multi-platform suite designed to help you discover, track, and apply faster.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {ecosystem.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.title}
                                    className="p-6 rounded-xl border border-border bg-background hover:border-primary/40 transition-colors space-y-3 flex flex-col justify-between"
                                >
                                    <div className="space-y-3">
                                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-foreground">
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-base font-bold text-foreground">
                                            {item.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {item.description}
                                        </p>
                                    </div>

                                    <div className="pt-2">
                                        {item.external ? (
                                            <a
                                                href={item.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                                            >
                                                <span>{item.linkText}</span>
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                            </a>
                                        ) : (
                                            <Link
                                                href={item.href}
                                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                                            >
                                                <span>{item.linkText}</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* 6. Founder's Note */}
            <section className="border-t border-border bg-muted/20">
                <div className="max-w-4xl mx-auto px-4 md:px-6 py-14 md:py-20 space-y-8">
                    <div className="space-y-3">
                        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Founder’s Note</p>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            A message to every student & fresher
                        </h2>
                    </div>

                    <div className="p-6 sm:p-8 rounded-xl border border-border bg-background space-y-6 text-base text-muted-foreground leading-relaxed">
                        <p>
                            &quot;I started FresherFlow because I watched too many talented classmates and juniors get overwhelmed by the chaos of off-campus hiring. When you don&apos;t have a tier-1 college tag or an immediate referral network, the entry-level hiring market can feel like an insurmountable wall.&quot;
                        </p>
                        <p>
                            &quot;Our goal with FresherFlow is simple: to level the playing field. Whether you studied at a state university, a local college, or learned to code entirely on your own, you deserve direct access to official company openings without anyone demanding a cut or misleading you.&quot;
                        </p>
                        <p>
                            &quot;FresherFlow will remain free, ad-clean, and focused on freshers. Thank you to every community member, contributor, and user who shares opportunities and helps keep this platform dependable.&quot;
                        </p>

                        <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center font-bold text-foreground text-sm font-mono border border-border shrink-0">
                                    SM
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-foreground">Sai Mukesh Cheekatla</div>
                                    <div className="text-xs text-muted-foreground">Creator & Lead Maintainer, FresherFlow</div>
                                </div>
                            </div>

                            {/* Founder Social Links */}
                            <div className="flex items-center gap-2 sm:self-center">
                                {founderSocialLinks.map((social) => {
                                    const Icon = social.icon;
                                    return (
                                        <a
                                            key={social.label}
                                            href={social.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={`Sai Mukesh Cheekatla on ${social.label}`}
                                            className="w-8 h-8 rounded-lg border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                                        >
                                            <Icon className="w-4 h-4" />
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 7. Community & Connect Channels */}
            <section className="border-t border-border">
                <div className="max-w-4xl mx-auto px-4 md:px-6 py-14 md:py-20 space-y-10">
                    <div className="space-y-3">
                        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Get Involved</p>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            Join our community
                        </h2>
                        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                            Stay updated with immediate job drops, report issues, or contribute to our open-source codebase.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {communityChannels.map((channel) => {
                            const IconComponent = channel.icon;
                            return (
                                <a
                                    key={channel.name}
                                    href={channel.href}
                                    target={channel.href.startsWith('mailto:') ? undefined : '_blank'}
                                    rel={channel.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                                    className="p-4 rounded-lg border border-border bg-background hover:border-primary/40 transition-colors flex flex-col justify-between space-y-3 group"
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <IconComponent className="w-4 h-4 text-foreground" />
                                            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                            {channel.name}
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-snug">
                                            {channel.description}
                                        </p>
                                    </div>
                                    <span className="text-xs font-semibold text-primary pt-1">
                                        {channel.action} &rarr;
                                    </span>
                                </a>
                            );
                        })}
                    </div>
                </div>
            </section>
        </div>
    );
}
