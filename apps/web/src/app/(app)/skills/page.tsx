import type { Metadata } from 'next';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { slugify } from '@fresherflow/utils/slugify';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { HeaderPortal } from '@/lib/components/HeaderPortal';
import { DirectoryClient, DirectoryEntity } from '@/ui/DirectoryClient';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Jobs by Skill | Fresher Jobs & Internships',
    description: 'Find verified fresher jobs and internships based on technical and professional skills, technologies and tools.',
    alternates: { canonical: `${SITE_URL}/skills` },
};

export default async function SkillsIndexPage() {
    const feed = await fetchBootstrapFeed();
    const opportunities = feed?.opportunities || [];

    const customSlugify = (str: string) => {
        const clean = str.replace(/\+/g, 'pp').replace(/#/g, 'sharp').replace(/^\./, 'dot-');
        return slugify(clean);
    };

    // Extract all skills with job counts
    const skillData: Record<string, DirectoryEntity> = {};
    for (const opp of opportunities) {
        for (const skill of opp.requiredSkills || []) {
            if (!skill) continue;
            const cleanSkill = skill.trim();
            const slug = customSlugify(cleanSkill);
            if (!skillData[slug]) {
                skillData[slug] = { name: cleanSkill, count: 0, slug };
            }
            skillData[slug].count++;
        }
    }

    // Sort by count desc, then alpha
    const sorted = Object.values(skillData)
        .filter((item) => item.count >= 5)
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return (
        <div className="bg-background font-sans">
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
                <HeaderPortal>
                    <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Skills' }]} />
                </HeaderPortal>

                <DirectoryClient 
                    title="Browse Jobs by Skill"
                    description="Find verified fresher jobs and internships by the skill you want to use."
                    data={sorted}
                    urlPrefix="/skills/"
                    entityType="skill"
                />
            </main>
        </div>
    );
}
