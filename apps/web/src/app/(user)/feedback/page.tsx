import { permanentRedirect } from 'next/navigation';

// Consolidated into the single /settings page (unlistedjobs-style tabs).
export default function Page() {
    permanentRedirect('/account?tab=feedback');
}
