import { permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Application Tracker',
    description: 'Track your job applications and their status.',
};

// Consolidated into the single /jobs app page (unlistedjobs-style tabs).
export default function Page() {
    permanentRedirect('/jobs?tab=applied');
}
