import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RESOURCES_FEED_URL } from '@/config/api';
import { SharedResource, ResourcesFeed, ResourceItemType, ResourceItemStatus, CompanyResourceMetadata } from '@fresherflow/types';
import { useSectorStore } from '@/store/useSectorStore';

const MOCK_RESOURCES: SharedResource[] = [];

const MOCK_COMPANY_METADATA: Record<string, CompanyResourceMetadata> = {};

export function useResourcesFeed() {
  const { sector } = useSectorStore();

  const { data, isLoading, error } = useQuery<ResourcesFeed>({
    queryKey: ['resourcesFeed', sector],
    queryFn: async () => {
      const response = await fetch(RESOURCES_FEED_URL);
      if (!response.ok) throw new Error('CDN Feed offline or unavailable');
      return response.json();
    },
    staleTime: 1000 * 60 * 10, // Cache in memory for 10 minutes
    retry: 1,
  });

  const feedResources = useMemo(() => {
    const rawResources = data?.resources || MOCK_RESOURCES;
    const targetSector = sector || 'PRIVATE';
    return rawResources.filter((res) => res.sector === targetSector);
  }, [data?.resources, sector]);

  const feedCompanyMetadata = data?.companyMetadata || MOCK_COMPANY_METADATA;

  // Dynamic selector for Company groups
  const getCompanyGroups = () => {
    const counts: Record<string, number> = {};
    feedResources.forEach((res) => {
      if (res.company) {
        counts[res.company] = (counts[res.company] || 0) + 1;
      }
    });

    return Object.entries(counts).map(([name, count]) => {
      const meta = feedCompanyMetadata[name];
      return {
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        logoUrl: meta?.logoUrl || undefined,
        count,
      };
    });
  };

  // Dynamic selector for Skill topic groups
  const getSkillGroups = () => {
    const counts: Record<string, number> = {};
    feedResources.forEach((res) => {
      res.skills.forEach((skill) => {
        counts[skill] = (counts[skill] || 0) + 1;
      });
    });

    return Object.entries(counts).map(([name, count]) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      count,
    })).sort((a, b) => b.count - a.count);
  };

  // Dynamic selector to get resources belonging to a group
  const getResourcesByGroup = (groupType: 'COMPANY' | 'SKILL', groupId: string) => {
    return feedResources.filter((res) => {
      if (groupType === 'COMPANY') {
        return res.company?.toLowerCase().replace(/\s+/g, '-') === groupId;
      } else {
        return res.skills.some((skill) => skill.toLowerCase().replace(/\s+/g, '-') === groupId);
      }
    });
  };

  return {
    resources: feedResources,
    companyMetadata: feedCompanyMetadata,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    getCompanyGroups,
    getSkillGroups,
    getResourcesByGroup,
  };
}
