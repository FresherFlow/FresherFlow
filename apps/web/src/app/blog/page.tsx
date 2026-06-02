'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, CalendarIcon, ClockIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

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
            '**FresherFlow is community-first**: A job and walk-in opportunity platform designed specifically for students and recent graduates in India. We built this mobile client around the philosophy of high-performance native interactions and verified data, completely bypassing the ad-heavy redirect hops of modern job portals.',
            'The Android app introduces several key features engineered specifically to solve fresher pain points:',
            '1. **Share Screen with Clipboard Detection**: Found a hidden gem? Copy the URL, and opening the app will instantly detect the link from your clipboard, letting you pre-fill and share it with the community in one tap. The app automatically checks for duplicates and guides users if a role is already active.',
            '2. **Interactive Eligibility Match Scores**: Powered by our custom MatchScoreGauge, the app instantly compares your education, skills, and batch year preferences against verified job requirements. You can see your match compatibility gauge before you even read the full details.',
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
            'By keeping the path to application direct and verified, we save candidates hours of frustration every single week.'
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
    const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

    const togglePost = (postId: string) => {
        setExpandedPostId((prev) => (prev === postId ? null : postId));
    };

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
        <main className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-16 space-y-12">
            <header className="space-y-4">
                <div>
                    <Link 
                        href="/" 
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all active:scale-95 shadow-sm"
                    >
                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                        Back to feed
                    </Link>
                </div>
                <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">Company Blog</p>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground leading-none">
                        Behind the Scenes.
                    </h1>
                    <p className="max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed mt-2">
                        Engineering details, product design decisions, and launch notes from the team building India&apos;s cleanest fresher platform.
                    </p>
                </div>
            </header>

            <section className="space-y-6">
                {BLOG_POSTS.map((post) => {
                    const isExpanded = expandedPostId === post.id;
                    return (
                        <article 
                            key={post.id}
                            className={`rounded-3xl border transition-all duration-300 bg-card overflow-hidden ${
                                isExpanded ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border hover:border-border/100 hover:shadow-sm'
                            }`}
                        >
                            {/* Card Header (Always Visible) */}
                            <div 
                                onClick={() => togglePost(post.id)}
                                className="p-6 md:p-8 cursor-pointer select-none space-y-4"
                            >
                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-semibold">
                                    <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full text-[10px] tracking-wider uppercase font-bold">
                                        {post.category}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <CalendarIcon className="w-3.5 h-3.5" />
                                        {post.date}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <ClockIcon className="w-3.5 h-3.5" />
                                        {post.readingTime}
                                    </div>
                                </div>

                                <div className="flex items-start justify-between gap-4">
                                    <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground group-hover:text-primary">
                                        {post.title}
                                    </h2>
                                    <div className="p-1 rounded-lg border border-border bg-background text-muted-foreground shrink-0 mt-1">
                                        {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                                    </div>
                                </div>

                                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                                    {post.excerpt}
                                </p>
                            </div>

                            {/* Card Body (Detailed Content) */}
                            {isExpanded && (
                                <div className="px-6 pb-8 md:px-8 md:pb-10 border-t border-border/40 pt-6 animate-in slide-in-from-top-3 duration-300">
                                    <div className="prose prose-neutral dark:prose-invert max-w-none space-y-4 text-sm md:text-base leading-relaxed text-foreground/90 font-medium font-sans">
                                        {post.content.map((paragraph, index) => (
                                            <p key={index}>{renderParagraph(paragraph)}</p>
                                        ))}
                                    </div>
                                    <div className="pt-6 mt-6 border-t border-border/40 flex justify-between items-center">
                                        <Link href="/download" className="text-xs font-bold text-primary hover:underline">
                                            Try the FresherFlow App &rarr;
                                        </Link>
                                        <button 
                                            onClick={() => togglePost(post.id)}
                                            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                                        >
                                            Collapse reading pane
                                        </button>
                                    </div>
                                </div>
                            )}
                        </article>
                    );
                })}
            </section>
        </main>
    );
}
