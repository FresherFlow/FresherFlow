import { useMemo, useState, useEffect } from 'react';
import { useFeedStore } from '@/store/useFeedStore';
import { Opportunity, EducationLevel } from '@fresherflow/types';
import Fuse from 'fuse.js';

export interface GovtExploreFilters {
  govLevels: string[];    // CENTRAL, STATE, BANKING...
  govStatuses: string[];  // UPCOMING, OPEN, CLOSED...
  education: string | null; // e.g. "10th Pass", "12th Pass", etc.
  sort: 'latest' | 'closing_soon';
  tag: string | null;     // category tag e.g. SSC, Railways
}

const matchesEducation = (opportunity: Opportunity, education: string): boolean => {
  const eduLower = education.toLowerCase().trim();

  // 1. Check allowedDegrees against typical education levels
  if (opportunity.allowedDegrees && opportunity.allowedDegrees.length > 0) {
    if (eduLower.includes('diploma') && opportunity.allowedDegrees.includes(EducationLevel.DIPLOMA)) {
      return true;
    }
    if (
      (eduLower.includes('degree') ||
        eduLower.includes('graduat') ||
        eduLower.includes('btech') ||
        eduLower.includes('bsc') ||
        eduLower.includes('bcom') ||
        eduLower.includes('ba')) &&
      opportunity.allowedDegrees.includes(EducationLevel.DEGREE)
    ) {
      return true;
    }
    if (
      (eduLower.includes('pg') ||
        eduLower.includes('postgrad') ||
        eduLower.includes('master') ||
        eduLower.includes('mtech') ||
        eduLower.includes('msc') ||
        eduLower.includes('mba')) &&
      opportunity.allowedDegrees.includes(EducationLevel.PG)
    ) {
      return true;
    }
  }

  // 2. Check governmentJobDetails eligibility education list
  const govtEdu = opportunity.governmentJobDetails?.eligibilityDetails?.education;
  if (Array.isArray(govtEdu)) {
    const matched = govtEdu.some((e: string) => {
      const eLower = e.toLowerCase().trim();
      return eLower.includes(eduLower) || eduLower.includes(eLower);
    });
    if (matched) return true;
  }

  // 3. Check governmentJobDetails.qualificationDetails
  const qualDetails = opportunity.governmentJobDetails?.qualificationDetails;
  if (typeof qualDetails === 'string') {
    if (qualDetails.toLowerCase().includes(eduLower)) return true;
  } else if (qualDetails && typeof qualDetails === 'object') {
    const stringified = JSON.stringify(qualDetails).toLowerCase();
    if (stringified.includes(eduLower)) return true;
  }

  // 4. Fallback search in title or description
  if (opportunity.title.toLowerCase().includes(eduLower)) return true;
  if (opportunity.description.toLowerCase().includes(eduLower)) return true;

  return false;
};

export const useGovtExplore = (
  searchQuery: string,
  filters: GovtExploreFilters
): Opportunity[] => {
  const cachedItems = useFeedStore((state) => state.cachedItems);

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const govtOpportunities = useMemo(() => {
    return cachedItems.filter((job) => !!job.governmentJobDetails);
  }, [cachedItems]);

  const fuseIndex = useMemo(() => {
    if (govtOpportunities.length === 0 || debouncedSearchQuery.trim().length < 2) return null;
    return new Fuse(govtOpportunities, {
      keys: [
        'title',
        'company',
        'governmentJobDetails.examName',
        'governmentJobDetails.recruitingBody',
        'governmentJobDetails.posts.name',
        'jobFunction',
        'locations'
      ],
      threshold: 0.3,
    });
  }, [govtOpportunities, debouncedSearchQuery]);

  return useMemo(() => {
    // 1. Fetch and filter strictly to 'GOVERNMENT' opportunities
    let govtJobs = govtOpportunities;

    // 2. Filter based on search query
    if (searchQuery.trim()) {
      if (fuseIndex && debouncedSearchQuery.trim().length >= 2) {
        govtJobs = fuseIndex.search(debouncedSearchQuery).map(r => r.item);
      }
    }

    // 3. Filter by govLevels (checks governmentJobDetails.governmentLevel matches one if not empty)
    if (filters.govLevels && filters.govLevels.length > 0) {
      govtJobs = govtJobs.filter((job) => {
        const level = job.governmentJobDetails?.governmentLevel;
        return (
          level &&
          filters.govLevels.some(
            (val) => val.toUpperCase() === level.toUpperCase()
          )
        );
      });
    }

    // 4. Filter by govStatuses (checks governmentJobDetails.applicationStatus matches one if not empty)
    if (filters.govStatuses && filters.govStatuses.length > 0) {
      govtJobs = govtJobs.filter((job) => {
        const status = job.governmentJobDetails?.applicationStatus;
        return (
          status &&
          filters.govStatuses.some(
            (val) => val.toUpperCase() === status.toUpperCase()
          )
        );
      });
    }

    // 5. Filter by education (matches allowedDegrees or qualification check)
    if (filters.education) {
      govtJobs = govtJobs.filter((job) => matchesEducation(job, filters.education!));
    }

    // 6. Filter by tag (matching governmentJobDetails.jobCategory or similar tags)
    if (filters.tag) {
      const tagLower = filters.tag.toLowerCase().trim();
      govtJobs = govtJobs.filter((job) => {
        const hasJobCategoryMatch = job.governmentJobDetails?.jobCategory?.some(
          (cat: string) => cat.toLowerCase().includes(tagLower) || tagLower.includes(cat.toLowerCase())
        );
        const hasTagMatch = job.tags?.some(
          (t: string) => t.toLowerCase().includes(tagLower) || tagLower.includes(t.toLowerCase())
        );
        return hasJobCategoryMatch || hasTagMatch;
      });
    }

    // 7. Sort by sort === 'latest' (postedAt desc) or 'closing_soon' (applicationEndDate asc)
    if (filters.sort === 'closing_soon') {
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
      // sort === 'latest' (postedAt desc)
      govtJobs.sort((a, b) => {
        const dateA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
        const dateB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
        return dateB - dateA;
      });
    }

    return govtJobs;
  }, [govtOpportunities, searchQuery, debouncedSearchQuery, fuseIndex, filters]);
};
