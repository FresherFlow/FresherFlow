import Link from 'next/link';
import { ArrowLeftIcon, CalendarIcon, ClockIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface BlogPost {
    id: string;
    title: string;
    excerpt: string;
    date: string;
    readingTime: string;
    category: string;
    content: string[];
}

const BLOG_POSTS: BlogPost[] = [
    {
        id: 'introducing-fresherflow-app',
        title: 'Announcing the FresherFlow Android App Launch',
        excerpt: 'We are launching the official FresherFlow Android app to bring zero-redirect fresher opportunities, clipboard-detected job sharing, and native application tracking directly to your device.',
        date: 'May 28, 2026',
        readingTime: '4 min read',
        category: 'Product Launch',
        content: [
            '**Finding your first job** as a graduate is stressful enough. But today, the job search is made infinitely harder by the sheer volume of noise, duplicate listings, and redirect spam on modern web aggregators. Today, we are taking a massive leap forward by releasing the official FresherFlow Mobile App for Android.',
            '**FresherFlow is community-first**: A job and walk-in opportunity platform designed specifically for students and recent graduates in India. We built this mobile client around fast native interactions and shared openings with source links, without the ad-heavy redirect hops of modern job portals.',
            'The Android app introduces several key features engineered specifically to solve fresher pain points:',
            '1. **Share Screen with Clipboard Detection**: Found a hidden gem? Copy the URL, and opening the app will instantly detect the link from your clipboard, letting you pre-fill and share it with the community in one tap. The app automatically checks for duplicates and guides users if a role is already active.',
            '2. **Interactive Eligibility Match Scores**: Powered by our custom MatchScoreGauge, the app instantly compares your education, skills, and batch year preferences against the listed job requirements. You can see your match compatibility gauge before you even read the full details.',
            '3. **Kanban Career Tracker**: Keep track of every job application status directly in-app. Move roles seamlessly through different stages—from Applied, to Interviewing, to Offered, or Rejected—using our custom Status Tracker Sheets.',
            '4. **Direct-to-Career Apply**: Click apply, and the app directly slides up the official corporate application portal (Workday, Greenhouse, Lever, etc.) in a clean, non-tracking in-app browser interface. No ads, no redirect loops.',
            '**Get started today**: Download the FresherFlow mobile app now on the Google Play Store and experience early-career hiring built with clarity. (iOS app is currently in development and will be launching soon!)'
        ]
    },
    {
        id: 'the-problem-with-redirect-spam',
        title: 'The Redirect Loop Epidemic in Entry-Level Hiring',
        excerpt: 'How current job boards profit off candidate frustration, and how our direct-to-career-portal apply model protects job seekers.',
        date: 'May 22, 2026',
        readingTime: '3 min read',
        category: 'Industry Insights',
        content: [
            'If you have searched for off-campus opportunities recently, you have likely encountered the "redirect loop". You click a button labeled "Apply Now", only to be taken to another search page. You click again, and you are redirected to an article. Three clicks later, you are looking at a popup asking for your email address, and the actual job listing is nowhere to be found.',
            'This happens because traditional job search engines monetize clicks. The more times they redirect you through pages with advertisements, the more revenue they generate. Your time and energy are treated as product inventory.',
            'We believe this model is fundamentally broken and disrespectful to job seekers.',
            'At FresherFlow, our API client and scraping tools bypass this entirely. If an opportunity is listed as active, clicking the apply button opens the official corporate site in a clean browser view. We do not place ads, track cookies across sites, or collect referral commissions by redirecting you to third-party ad networks.',
            'By keeping the path to application direct, with source links you can check, we save candidates hours of frustration every single week.'
        ]
    },
    {
        id: 'under-the-hood-static-sharding',
        title: 'Under the Hood: Building an Instant Job Feed via Static CDN Shards',
        excerpt: 'A technical deep-dive into how we use Cloudflare R2 and in-memory sharding to scale FresherFlow feed deliveries to under 100ms.',
        date: 'May 15, 2026',
        readingTime: '5 min read',
        category: 'Engineering',
        content: [
            'As FresherFlow grew, we faced a classic engineering problem: our database connection limits were getting saturated during peak traffic periods when push alerts went out.',
            'Database queries for job searches and eligibility matching are highly repetitive. Querying the PostgreSQL database via Prisma for every single client load was slow and created unnecessary compute cost on our Neon serverless database.',
            'Our solution was to implement "Distributed Static Data Shards" on our CDN.',
            'We wrote a static feed service in Express that debounces rapid database changes. Whenever a moderator approves or updates a job, the backend collapses these changes and runs exactly one query to pull all active opportunities. It then groups them in-memory by company name and category types, and compiles them into highly compressed JSON files.',
            'These tiny shard files (often less than 5KB) are uploaded directly to our Cloudflare R2 CDN bucket. When a user opens the FresherFlow app or views a company profile, they download these tiny static files directly from the nearest edge CDN node in milliseconds, bypassing the Express API server and database entirely.',
            'This architecture keeps database connection usage flat, reduces server responses to under 100ms, and allows the platform to scale to millions of active users with minimal hosting costs.'
        ]
    }
];

export default function BlogPage() {
    const renderParagraph = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="font-extrabold" style={{ color: 'hsl(var(--foreground))' }}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <main className="mx-auto w-full max-w-[1120px] px-6 pb-24 pt-16 space-y-12">
            <header className="space-y-5">
                <div>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-[2px] border border-border px-3 py-1.5 font-record text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                    >
                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                        Back to feed
                    </Link>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center gap-2.5 font-record text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        <span className="h-[7px] w-[7px] rounded-full bg-[var(--ff-accent)]" aria-hidden />
                        Company blog
                    </div>
                    <h1 className="max-w-[16ch] font-display text-[clamp(34px,5vw,60px)] font-extrabold leading-[1.02] tracking-[-0.025em] text-foreground">
                        Behind the scenes.
                    </h1>
                    <p className="max-w-[58ch] text-[15.5px] leading-relaxed text-muted-foreground">
                        Engineering details, product design decisions, and launch notes from the team building a community home for freshers.
                    </p>
                </div>
            </header>

            <section className="border-t border-border">
                {BLOG_POSTS.map((post) => (
                    <details
                        key={post.id}
                        className="group border-b border-border"
                    >
                        {/* Row header — ruled list row, homepage register rhythm */}
                        <summary className="cursor-pointer select-none list-none px-2 py-7 transition-[padding,background-color] hover:bg-muted/40 hover:px-4 [&::-webkit-details-marker]:hidden">
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-record text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                                <span className="font-semibold text-[var(--ff-accent)]">{post.category}</span>
                                <span>{post.date}</span>
                                <span>{post.readingTime}</span>
                            </div>

                            <div className="mt-2 flex items-start justify-between gap-4">
                                <h2 className="max-w-[30ch] font-display text-[clamp(19px,2.2vw,26px)] font-extrabold leading-[1.15] tracking-[-0.015em] text-foreground transition-colors group-hover:text-[var(--ff-accent)]">
                                    {post.title}
                                </h2>
                                <ChevronDownIcon className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                            </div>

                            <p className="mt-2 max-w-[70ch] text-[14px] leading-relaxed text-muted-foreground">
                                {post.excerpt}
                            </p>
                        </summary>

                        {/* Expanded body */}
                        <div className="px-2 pb-8 md:px-4">
                            <div className="max-w-[72ch] space-y-4 border-l-2 border-[var(--ff-accent)]/40 pl-5 text-[14px] leading-relaxed text-foreground/90">
                                {post.content.map((paragraph, index) => (
                                    <p key={index}>{renderParagraph(paragraph)}</p>
                                ))}
                            </div>
                            <div className="mt-6">
                                <Link
                                    href="/app"
                                    className="text-[13px] font-semibold text-foreground underline decoration-[var(--ff-accent)] decoration-2 underline-offset-4 transition-colors hover:text-[var(--ff-accent)]"
                                >
                                    Try the FresherFlow app →
                                </Link>
                            </div>
                        </div>
                    </details>
                ))}
            </section>
        </main>
    );
}
