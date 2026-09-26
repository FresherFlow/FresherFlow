import { permanentRedirect } from 'next/navigation';

/** City walk-in pages moved with the walk-in feed: /jobs/walkins/[city]
 *  → /drives/walk-in/[city]. 308 preserves the per-city SEO signal. */
export default function LegacyWalkInCityPage({
    params,
}: {
    params: Promise<{ city: string }>;
}) {
    // Next 15+ delivers route params asynchronously.
    return params.then(({ city }) => {
        permanentRedirect(`/drives/walk-in/${encodeURIComponent(city)}`);
    });
}
