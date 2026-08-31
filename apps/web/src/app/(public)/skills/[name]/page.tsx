import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { toOpportunityCardDTO } from '@fresherflow/types';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { Suspense } from 'react';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { FeedPageSkeleton } from '@/features/opportunities/components/OpportunitySkeletons';
import { SITE_URL, CDN_URL } from '@/lib/utils/runtimeConfig';
import { slugify } from '@fresherflow/utils/slugify';
import { truncateTitleByPixels, truncateDescription } from '@/lib/seo/seoMetrics';



export const revalidate = false;
export const dynamicParams = false;

const SKILL_MIN_JOBS = 5;

export async function generateStaticParams() {
    // Count how many jobs reference each canonical skill.
    // Only pre-build pages with >= SKILL_MIN_JOBS mentions.
    const counts = new Map<string, number>();
    try {
        const feed = await fetchBootstrapFeed(false, undefined, true);
        for (const opp of feed?.opportunities || []) {
            for (const skill of opp.requiredSkills || []) {
                const slug = slugify(skill);
                if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
            }
        }
    } catch { /* if CDN is down, fall back to empty — better than garbage */ }

    // Only emit skills that clear the threshold.
    const validSlugs: string[] = [];
    counts.forEach((count, slug) => {
        if (count >= SKILL_MIN_JOBS) {
            validSlugs.push(slug);
        }
    });

    return validSlugs.map(name => ({ name }));
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
    const slug = slugify(decodeURIComponent(name));
    const label = formatSkillLabel(name);

    const rawTitle = `${label} Jobs for Freshers | Jobs & Internships`;
    const title = truncateTitleByPixels(rawTitle);
    const rawDescription = `Find verified fresher jobs and internships requiring ${label}, including entry-level opportunities with direct official apply links.`;
    const description = truncateDescription(rawDescription);
    const base = SITE_URL.replace(/\/+$/, '');
    const ogImageUrl = `${CDN_URL}/og/skills/${slug}.png`;

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
    
    // Ensure canonical lowercased slug
    const decodedName = decodeURIComponent(rawName);
    const properSlug = slugify(decodedName);
    
    if (!properSlug) {
        notFound();
    }
    
    if (rawName !== properSlug) {
        permanentRedirect(`/skills/${properSlug}`);
    }
    
    const slug = properSlug;

    const label = formatSkillLabel(slug);
    const feed = await fetchBootstrapFeed(false, undefined, true);
    const opportunities = feed?.opportunities || [];
    
    const filtered = opportunities.filter(opp => 
        opp.requiredSkills && 
        Array.isArray(opp.requiredSkills) && 
        opp.requiredSkills.some(skill => {
            const lowerSkill = skill.toLowerCase();
            return lowerSkill === decodedName.toLowerCase() || lowerSkill.replace(/[^a-z0-9]+/g, '-') === slug;
        })
    );

    // No jobs match this skill slug
    if (filtered.length === 0) {
        notFound();
    }

    const seoText = `If you have skills in ${label}, this page gathers all active job openings and internships that match your expertise. We verify each posting manually to ensure the application links lead directly to official company portals and exclude third-party redirect forms. Ensure you review specific criteria such as graduation year limits, preferred degrees, and secondary skills before submitting your application.`;

    return (
        <Suspense fallback={<FeedPageSkeleton />}>
            <CategoryPage 
                type={null} 
                initialData={{
                    opportunities: filtered.map(toOpportunityCardDTO) as any,
                    total: filtered.length,
                    cachedAt: feed?.generatedAt ? new Date(feed.generatedAt).getTime() : Date.now(),
                }} 
                initialFilters={{ skills: [label] }} 
                canonicalRedirect={true}
            />
        </Suspense>
    );
}
