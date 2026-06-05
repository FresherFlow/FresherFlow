import React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { API_URL } from '@/lib/runtimeConfig';
import { getOpportunityPath } from '@/lib/opportunityPath';

type Props = {
    params: Promise<{ id: string }>;
};

// On-demand revalidation
export const revalidate = 300; // 5 minutes

async function fetchGovernmentJob(id: string) {
    try {
        const response = await fetch(`${API_URL}/api/public/government-jobs/${encodeURIComponent(id)}`, {
            method: 'GET',
            headers: {
                'X-Requested-From': 'fresherflow-web',
            },
            next: { revalidate: 300 },
        });

        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        console.error('Error fetching government job for page details', e);
        return null;
    }
}

// SEO Metadata Generation
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const job = await fetchGovernmentJob(id);
    if (!job || !job.opportunity) {
        return {
            title: 'Recruitment Notice Not Found | FresherFlow',
            description: 'This government recruitment notice is no longer available.',
        };
    }

    const title = `${job.opportunity.title} Recruitment 2026 - ${job.recruitingBody || job.opportunity.company}`;
    const description = job.opportunity.description || `Apply online for verified ${job.opportunity.title} government recruitment vacancy details, syllabus, dates and fees on FresherFlow.`;

    return {
        title: `${title} | FresherFlow`,
        description,
        alternates: {
            canonical: `/government-jobs/${id}`,
        },
    };
}

export default async function GovernmentJobDetailPage({ params }: Props) {
    const { id } = await params;
    const details = await fetchGovernmentJob(id);

    if (!details || !details.opportunity) {
        notFound();
    }

    const opp = details.opportunity;
    
    // Redirect to the canonical unified slug details page
    redirect(getOpportunityPath(opp.type, opp.slug || opp.id));
}
