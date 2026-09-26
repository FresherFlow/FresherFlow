'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { TabBar } from '@/ui/TabBar';
import { HeaderPortal } from '@/features/navigation/HeaderPortal';
import { UsernameGate } from '@/features/auth/components/ProfileGate';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFirebaseFollowedCompanies } from '@/features/companies/hooks/useFirebaseFollowedCompanies';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/ui/Breadcrumb';
import { FollowedCompaniesPanel } from './FollowedCompaniesPanel';
import CompaniesDirectoryClient from './CompaniesDirectoryClient';
import type { CompanyDirectoryItem, CompanyFollowSummary } from '@/features/companies/types';

const COMPANIES_TABS = [
    { key: 'all', label: 'All companies', href: '/companies' },
    { key: 'following', label: 'Following', href: '/companies?tab=following' },
] as const;

type CompaniesTabKey = (typeof COMPANIES_TABS)[number]['key'];

interface CompaniesTabsClientProps {
    companies: CompanyDirectoryItem[];
    totalJobs: number;
}

/**
 * /companies is one page: the directory and the signed-in following list are
 * ?tab= views on the shared pill TabBar (same shape as /community and
 * /resources). The tab is read client-side so the route stays static and
 * cache-friendly — the page renders the directory as the <Suspense> fallback,
 * so the public HTML still ships it.
 */
export default function CompaniesTabsClient({ companies, totalJobs }: CompaniesTabsClientProps) {
    const rawTab = useSearchParams().get('tab');
    const active: CompaniesTabKey = COMPANIES_TABS.some((t) => t.key === rawTab)
        ? (rawTab as CompaniesTabKey)
        : 'all';

    const { user } = useAuth();
    const { followedMap, loading, toggleFollow } = useFirebaseFollowedCompanies(user?.id);
    const followedCount = Object.keys(followedMap).length;

    // Name/logo/role count per followed slug — straight from the directory the
    // All companies tab renders, so the two tabs never disagree.
    const companyDirectory = useMemo(
        () =>
            Object.fromEntries(
                companies.map((company) => [
                    company.slug,
                    {
                        name: company.name,
                        logoUrl: company.logoUrl ?? null,
                        website: company.website ?? null,
                        count: company.count,
                    } satisfies CompanyFollowSummary,
                ])
            ),
        [companies]
    );

    const items = COMPANIES_TABS.map((tab) => ({
        ...tab,
        label:
            tab.key === 'following' && followedCount > 0
                ? `Following (${followedCount})`
                : tab.label,
    }));

    return (
        <>
            <HeaderPortal>
                <Breadcrumb>
                    <BreadcrumbList>
                        {active === 'following' ? (
                            <>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/companies">Companies</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Following</BreadcrumbPage>
                                </BreadcrumbItem>
                            </>
                        ) : (
                            <>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Companies</BreadcrumbPage>
                                </BreadcrumbItem>
                            </>
                        )}
                    </BreadcrumbList>
                </Breadcrumb>
            </HeaderPortal>

            <TabBar items={items} activeKey={active} />

            {active === 'following' ? (
                <UsernameGate>
                    <div className="pt-4">
                        <FollowedCompaniesPanel
                            followedMap={followedMap}
                            loading={loading}
                            toggleFollow={toggleFollow}
                            companyDirectory={companyDirectory}
                        />
                    </div>
                </UsernameGate>
            ) : (
                <CompaniesDirectoryClient companies={companies} totalJobs={totalJobs} />
            )}
        </>
    );
}
