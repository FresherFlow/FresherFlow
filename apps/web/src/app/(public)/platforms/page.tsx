import { permanentRedirect } from 'next/navigation';

// Merged into /resources as ?tab=platforms (unlistedjobs-style tabs).
export default function Page() {
    permanentRedirect('/resources?tab=platforms');
}
