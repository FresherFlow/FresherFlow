import { permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Job Alerts',
    description: 'Manage your job alert preferences.',
};

// Consolidated into the single /jobs app page (unlistedjobs-style tabs).
export default function Page() {
    permanentRedirect('/jobs?tab=alerts');
}
