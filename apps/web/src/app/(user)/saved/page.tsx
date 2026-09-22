import { permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Saved Jobs',
    description: 'View your saved job opportunities.',
};

// Consolidated into the single /jobs app page (unlistedjobs-style tabs).
export default function Page() {
    permanentRedirect('/jobs?tab=saved');
}
