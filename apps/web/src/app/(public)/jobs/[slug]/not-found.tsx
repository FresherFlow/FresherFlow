import { ClosedListingView } from '@/features/jobs/components/detail/ClosedListingView';
import { getValidDirectoryLinks } from '@/features/jobs/utils/detailUtils';
import { fetchFeedIndex } from '@/lib/api/feedServer';

/** Route-level 404 for job details: one clear closed-listing card, not a bare error. */
export default async function JobDetailNotFound() {
    const feed = await fetchFeedIndex().catch(() => null);
    const links = feed?.opportunities ? getValidDirectoryLinks(feed.opportunities) : null;

    return (
        <ClosedListingView
            validSkills={links?.validSkills}
            validLocations={links?.validLocations}
        />
    );
}
