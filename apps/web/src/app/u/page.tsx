import type { Metadata } from 'next';
import { UPageClient } from './UPageClient';

export const metadata: Metadata = {
    title: 'FresherFlow /u/ — The Modern Candidate Portfolio for Freshers',
    description:
        'Create your verified, recruiter-ready public portfolio. Showcase your live project demos, GitHub docs, academic journey, and career preferences with one simple link.',
};

export default function PublicProfileBrandingPage() {
    return <UPageClient />;
}
