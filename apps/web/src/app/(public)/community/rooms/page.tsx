import { permanentRedirect } from 'next/navigation';

// Consolidated into the single /community page (unlistedjobs-style tabs).
export default function Page() {
    permanentRedirect('/community?tab=rooms');
}
