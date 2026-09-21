import type { Metadata } from 'next';
import { UPageClient } from '@/features/profile/components/public/UPageClient';

export const revalidate = 3600;

export const metadata: Metadata = {
    title: 'Fresher profiles — claim your link | FresherFlow',
    description: 'Claim your fresher profile at fresherflow.in/u/yourname — skills, projects, batch and availability, recruiter-ready.',
    alternates: { canonical: '/u' },
};

export default function UPage() {
    return <UPageClient />;
}
