import { permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Notifications',
    description: 'View your notifications and updates.',
};

// Consolidated into the single /jobs app page (unlistedjobs-style tabs).
export default function Page() {
    permanentRedirect('/jobs?tab=notifications');
}
