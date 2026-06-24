import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import ProgrammaticHub from '@/features/opportunities/components/ProgrammaticHub';
import { SITE_URL } from '@/lib/utils/runtimeConfig';

export const revalidate = false;
export const dynamicParams = true;

const TOP_SKILLS = [
    'java',
    'python',
    'react',
    'javascript',
    'sql',
    'aws',
    'testing',
    'node-js',
    'c-plus-plus',
    'data-structures',
    'html-css'
];

export async function generateStaticParams() {
    // Pre-build the hardcoded top skills + any additional skills found in the live feed.
    // This prevents bots crawling skill slugs from triggering on-demand renders and ISR writes.
    const staticParams = new Set(TOP_SKILLS);
    try {
        const { fetchBootstrapFeed } = await import('@/lib/api/cdnFeed');
        const { slugify } = await import('@fresherflow/utils');
        const feed = await fetchBootstrapFeed();
        if (feed?.opportunities) {
            for (const opp of feed.opportunities) {
                for (const skill of opp.requiredSkills || []) {
                    const s = slugify(skill);
                    if (s) staticParams.add(s);
                }
            }
        }
    } catch {
        // fallback to TOP_SKILLS only
    }
    return Array.from(staticParams).map(name => ({ name }));
}

type Props = {
    params: Promise<{ name: string }>;
};

function formatSkillLabel(slug: string): string {
    const mappings: Record<string, string> = {
        'java': 'Java',
        'python': 'Python',
        'react': 'React',
        'javascript': 'JavaScript',
        'sql': 'SQL',
        'aws': 'AWS',
        'testing': 'Testing',
        'node-js': 'Node.js',
        'c-plus-plus': 'C++',
        'data-structures': 'DSA',
        'html-css': 'HTML/CSS'
    };
    return mappings[slug.toLowerCase()] || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { name } = await params;
    const { slugify } = await import('@fresherflow/utils');
    const slug = slugify(decodeURIComponent(name));
    const label = formatSkillLabel(name);

    const title = `${label} Jobs for Freshers 2026`;
    const description = `Find verified entry-level software jobs and internships requiring ${label} skills. Direct apply links, detailed eligibility criteria, and no fake listings.`;
    const base = (SITE_URL || 'https://fresherflow.in').replace(/\/+$/, '');
    const ogImageUrl = `https://cdn.fresherflow.in/og/skills/${slug}.png`;

    return {
        title,
        description,
        alternates: {
            canonical: `${base}/skills/${slug}`
        },
        openGraph: {
            title,
            description,
            type: 'website',
            images: [
                {
                    url: ogImageUrl,
                    width: 1200,
                    height: 630,
                    alt: title,
                }
            ]
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImageUrl],
        }
    };
}

export default async function SkillPage({ params }: Props) {
    const { name: rawName } = await params;
    const { slugify } = await import('@fresherflow/utils');
    const slug = slugify(decodeURIComponent(rawName));

    if (!slug) {
        notFound();
    }

    const label = formatSkillLabel(slug);
    const feed = await fetchBootstrapFeed();
    const opportunities = feed?.opportunities || [];
    
    const filtered = opportunities.filter(opp => 
        opp.requiredSkills && 
        Array.isArray(opp.requiredSkills) && 
        opp.requiredSkills.some(skill => slugify(skill) === slug)
    );

    // No jobs match this skill slug — don't cache the empty page in ISR.
    // Bots crawling arbitrary skill URLs would write thousands of empty ISR entries.
    if (filtered.length === 0) {
        const { unstable_noStore } = await import('next/cache');
        unstable_noStore();
        notFound();
    }

    const { extractHubRelations } = await import('@/features/opportunities/utils/hubLinking');
    const { topCompanies, relatedSkills, relatedLocations } = extractHubRelations(filtered, { skill: slug });

    const lastUpdated = feed?.generatedAt 
        ? new Date(feed.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const title = `${label} Jobs for Freshers`;
    const description = `Explore verified off-campus drives, internships, and entry-level positions requiring ${label} skills.`;
    const seoText = `If you have skills in ${label}, this page gathers all active job openings and internships that match your expertise. We verify each posting manually to ensure the application links lead directly to official company portals and exclude third-party redirect forms. Ensure you review specific criteria such as graduation year limits, preferred degrees, and secondary skills before submitting your application.`;

    return (
        <ProgrammaticHub
            title={title}
            description={description}
            seoText={seoText}
            opportunities={filtered}
            lastUpdated={lastUpdated}
            breadcrumbLabel={label}
            breadcrumbUrl={`/skills/${slug}`}
            parentBreadcrumb={{ label: 'Skills', href: '/skills' }}
            topCompanies={topCompanies}
            relatedSkills={relatedSkills}
            relatedLocations={relatedLocations}
        />
    );
}
