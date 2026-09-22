import { permanentRedirect } from 'next/navigation';

// Consolidated into the single /jobs app page (unlistedjobs-style tabs).
export default function Page() {
    permanentRedirect('/jobs?tab=for-you');
}
