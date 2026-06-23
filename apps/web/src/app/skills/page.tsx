import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { slugify } from '@fresherflow/utils';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { SITE_URL } from '@/lib/utils/runtimeConfig';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Browse Jobs by Skill',
    description: 'Explore all in-demand skills for freshers in India. Find verified jobs, internships and off-campus drives filtered by technology, domain, or role skill.',
    alternates: { canonical: `${SITE_URL || 'https://fresherflow.in'}/skills` },
};

export default async function SkillsIndexPage() {
    const feed = await fetchBootstrapFeed();
    const opportunities = feed?.opportunities || [];

    const customSlugify = (str: string) => {
        const clean = str.replace(/\+/g, 'pp').replace(/#/g, 'sharp').replace(/^\./, 'dot-');
        return slugify(clean);
    };

    // Extract all skills with job counts
    const skillData: Record<string, { skill: string, count: number, slug: string }> = {};
    for (const opp of opportunities) {
        for (const skill of opp.requiredSkills || []) {
            if (!skill) continue;
            const cleanSkill = skill.trim();
            const slug = customSlugify(cleanSkill);
            if (!skillData[slug]) {
                skillData[slug] = { skill: cleanSkill, count: 0, slug };
            }
            skillData[slug].count++;
        }
    }

    // Sort by count desc, then alpha
    const sorted = Object.values(skillData)
        .filter((item) => item.count >= 1)
        .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill));

    // Group alphabetically
    const groups: Record<string, { skill: string; count: number; slug: string }[]> = {};
    for (const { skill, count, slug } of sorted) {
        const letter = skill[0].toUpperCase();
        const key = /[A-Z]/.test(letter) ? letter : '#';
        if (!groups[key]) groups[key] = [];
        groups[key].push({ skill, count, slug });
    }

    const letters = Object.keys(groups).sort((a, b) => {
        if (a === '#') return 1;
        if (b === '#') return -1;
        return a.localeCompare(b);
    });

    const totalSkills = sorted.length;
    const totalJobs = opportunities.length;

    return (
        <div className="min-h-screen bg-background pb-20">
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">

                <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Skills' }]} />

                {/* Header */}
                <div className="border-b border-border/60 pb-6 space-y-2">
                    <h1 className="text-2xl md:text-4xl font-black tracking-tight text-foreground">
                        Browse by Skill
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium max-w-2xl">
                        Find verified fresher jobs and internships by the skill you want to use.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2 text-xs font-medium text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                            {totalSkills} skills listed
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border">
                            {totalJobs} active listings
                        </span>
                    </div>
                </div>

                {/* Letter jump nav */}
                <div className="flex flex-wrap gap-1.5">
                    {letters.map(letter => (
                        <a
                            key={letter}
                            href={`#letter-${letter}`}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold bg-muted hover:bg-primary/10 hover:text-primary border border-border transition-colors"
                        >
                            {letter}
                        </a>
                    ))}
                </div>

                {/* Skill groups */}
                <div className="space-y-10">
                    {letters.map(letter => (
                        <div key={letter} id={`letter-${letter}`} className="scroll-mt-24 space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-xl font-black text-foreground">{letter}</span>
                                <span className="text-xs font-semibold text-muted-foreground">{groups[letter].length} skill{groups[letter].length !== 1 ? 's' : ''}</span>
                                <div className="flex-1 h-px bg-border/60" />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {groups[letter].map(({ skill, count, slug }) => (
                                    <Link
                                        key={slug}
                                        href={`/skills/${slug}`}
                                        className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card hover:bg-primary/5 border border-border hover:border-primary/30 transition-all"
                                    >
                                        <span className="text-sm font-semibold text-foreground capitalize group-hover:text-primary transition-colors">
                                            {skill}
                                        </span>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                            {count}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

            </main>
        </div>
    );
}
