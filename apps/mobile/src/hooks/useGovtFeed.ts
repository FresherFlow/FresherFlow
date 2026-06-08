import { useMemo } from 'react';
import { useFeedStore } from '@/store/useFeedStore';
import { Opportunity } from '@fresherflow/types';

export const GOVT_FEED_TABS = [
  { id: 'latest',       label: 'Latest' },
  { id: null,           label: 'All' },
  { id: 'closing_soon', label: 'Closing Soon' },
  { id: 'central',      label: 'Central Govt' },
  { id: 'state',        label: 'State Govt' },
  { id: 'banking',      label: 'Banking' },
] as const;

export const useGovtFeed = (tabId: string | null): Opportunity[] => {
  const cachedItems = useFeedStore((state) => state.cachedItems);

  return useMemo(() => {
    // Filter strictly to GOVERNMENT opportunities
    let govtJobs = cachedItems.filter((job) => !!job.governmentJobDetails);

    // Filter by government level if tabId matches CENTRAL, STATE, or BANKING levels
    if (tabId === 'central') {
      govtJobs = govtJobs.filter(
        (job) => job.governmentJobDetails?.governmentLevel === 'CENTRAL'
      );
    } else if (tabId === 'state') {
      govtJobs = govtJobs.filter(
        (job) => job.governmentJobDetails?.governmentLevel === 'STATE'
      );
    } else if (tabId === 'banking') {
      govtJobs = govtJobs.filter(
        (job) => job.governmentJobDetails?.governmentLevel === 'BANKING'
      );
    }

    // Sort the list based on the active tabId
    if (tabId === 'closing_soon') {
      govtJobs.sort((a, b) => {
        const dateAStr = a.governmentJobDetails?.applicationEndDate;
        const dateBStr = b.governmentJobDetails?.applicationEndDate;

        if (!dateAStr && !dateBStr) return 0;
        if (!dateAStr) return 1;
        if (!dateBStr) return -1;

        const timeA = new Date(dateAStr).getTime();
        const timeB = new Date(dateBStr).getTime();

        const isAInvalid = isNaN(timeA);
        const isBInvalid = isNaN(timeB);
        if (isAInvalid && isBInvalid) return 0;
        if (isAInvalid) return 1;
        if (isBInvalid) return -1;

        return timeA - timeB;
      });
    } else {
      // For 'latest', null (All), and levels, sort by postedAt descending (newest first)
      govtJobs.sort((a, b) => {
        const dateA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
        const dateB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
        return dateB - dateA;
      });
    }

    return govtJobs;
  }, [cachedItems, tabId]);
};
