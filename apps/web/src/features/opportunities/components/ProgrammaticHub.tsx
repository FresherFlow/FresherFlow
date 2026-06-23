'use client';

import { useState, useEffect } from 'react';
import { Opportunity } from '@fresherflow/types';
import { OpportunityGrid } from './OpportunityGrid';
import Link from 'next/link';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import { PageTagLinks } from '@/ui/PageTagLinks';
import CompanyLogo from '@/ui/CompanyLogo';
import { EmptyState } from '@/ui/EmptyState';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { cn } from '@repo/ui/utils/cn';
import { OpportunityDetailPane } from './OpportunityDetailPane';

export interface HubLink {
    label: string;
    url: string;
}

export interface HubCompany {
    name: string;
    logoUrl?: string | null;
    website?: string | null;
    slug: string;
}

interface ProgrammaticHubProps {
    title: string;
    description: string;
    seoText: string;
    opportunities: Opportunity[];
    lastUpdated: string;
    breadcrumbLabel: string;
    breadcrumbUrl: string;
    relatedSkills?: HubLink[];
    relatedLocations?: HubLink[];
    topCompanies?: HubCompany[];
    parentBreadcrumb?: { label: string; href: string };
}

export default function ProgrammaticHub({
    title,
    description,
    seoText,
    opportunities,
    lastUpdated,
    breadcrumbLabel,
    breadcrumbUrl,
    relatedSkills = [],
    relatedLocations = [],
    topCompanies = [],
    parentBreadcrumb
}: ProgrammaticHubProps) {
    const [visibleCount, setVisibleCount] = useState(12);
    const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
    const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

    useEffect(() => {
        setIsDesktop(window.innerWidth >= 1024);
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Auto-select first job on desktop
    useEffect(() => {
        if (isDesktop === true && !selectedOpp && opportunities.length > 0) {
            setSelectedOpp(opportunities[0]);
        }
    }, [isDesktop, selectedOpp, opportunities]);

    useEffect(() => {
        if (!selectedOpp) return;
        if (window.innerWidth >= 1024) return; // Only lock scroll on mobile
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, [selectedOpp]);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (!event?.state || !event.state.modalOpen) {
                setSelectedOpp(null);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const handleCloseOpportunityPane = () => {
        const mobileModal = document.getElementById('mobile-detail-modal');
        if (mobileModal) {
            mobileModal.classList.remove('animate-in', 'slide-in-from-bottom');
            mobileModal.classList.add('animate-out', 'slide-out-to-bottom', 'fade-out', 'duration-300');
        }
        setTimeout(() => {
            setSelectedOpp(null);
            if (window.history.state?.modalOpen) window.history.back();
        }, 250);
    };

    const hasSidebar = relatedSkills.length > 0 || relatedLocations.length > 0 || topCompanies.length > 0;
    const visibleOpportunities = opportunities.slice(0, visibleCount);

    return (
        <>
            <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-8">
                {/* Breadcrumbs */}
                <Breadcrumb items={[
                    { label: 'Home', href: '/' },
                    ...(parentBreadcrumb ? [parentBreadcrumb] : []),
                    { label: breadcrumbLabel, href: breadcrumbUrl },
                ]} />

                {/* Header */}
                <div id="hub-top-header" className="flex flex-col gap-2 pb-6">
                    <h1 className="text-2xl md:text-4xl font-black tracking-tight text-foreground">
                        {title}
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium max-w-2xl">
                        {description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-muted-foreground font-medium">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                            <ClockIcon className="w-3.5 h-3.5" />
                            {opportunities.length} Active Positions
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted border border-border">
                            Last updated {lastUpdated}
                        </span>
                    </div>
                </div>

                {/* Job Grid — full width, same card on every page */}
                {opportunities.length === 0 ? (
                <EmptyState
                    title="No active opportunities found"
                    description="We currently have no active listings matching this criteria. Please check back soon."
                    action={
                        <Link href="/" className="inline-block text-sm font-semibold text-primary hover:underline">
                            Browse all opportunities →
                        </Link>
                    }
                />
                ) : (
                    <div className="w-full grid grid-cols-1 lg:grid-cols-[1.3fr_1.7fr] gap-6 items-start">
                        
                        {/* Left Column: Grid list */}
                        <div id="hub-grid-container" className="min-w-0 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2 custom-scrollbar">
                            <OpportunityGrid
                                opportunities={visibleOpportunities}
                                isLoading={false}
                                error={null}
                                isAdmin={false}
                                onToggleSave={() => {}}
                                onClearFilters={() => {}}
                                onRetry={() => {}}
                                isSplitView={true}
                                selectedOppId={selectedOpp?.id}
                                onSelectOpportunity={(opp) => {
                                    setSelectedOpp(opp);
                                    window.history.pushState({ modalOpen: true }, '', window.location.href);
                                }}
                            />
                            {visibleCount < opportunities.length && (
                                <div className="flex justify-center pt-8 pb-4">
                                    <button
                                        onClick={() => setVisibleCount(prev => prev + 12)}
                                        className="px-6 py-2.5 rounded-full bg-muted hover:bg-muted/80 text-sm font-bold text-foreground transition-colors"
                                    >
                                        Load more listings
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Detail Panel / Empty State (Desktop only) */}
                        <div className="hidden lg:flex flex-col sticky top-24 h-[calc(100vh-8rem)] bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                            {selectedOpp ? (
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <OpportunityDetailPane
                                        oppId={selectedOpp.slug || selectedOpp.id}
                                        initialData={selectedOpp}
                                        onClose={handleCloseOpportunityPane}
                                    />
                                </div>
                            ) : visibleOpportunities.length > 0 ? (
                                <div className="flex-1 p-8 animate-pulse flex flex-col gap-4">
                                    <div className="h-8 bg-muted/50 rounded w-1/2" />
                                    <div className="h-4 bg-muted/50 rounded w-1/4" />
                                    <div className="h-40 bg-muted/50 rounded-xl w-full mt-4" />
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center bg-muted/20">
                                    <EmptyState
                                        title="Select an opportunity"
                                        description="Click on an opportunity card from the list to view its complete details here."
                                        icon="search"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Mobile Detail Modal/Drawer */}
                        {selectedOpp && isDesktop === false && (
                            <div id="mobile-detail-modal" className="lg:hidden fixed inset-0 z-[120] flex flex-col bg-background animate-in slide-in-from-bottom duration-300">
                                <div className="pt-[env(safe-area-inset-top)] bg-card shrink-0" />
                                <div className="flex-1 flex flex-col min-h-0">
                                    <OpportunityDetailPane
                                        oppId={selectedOpp.slug || selectedOpp.id}
                                        initialData={selectedOpp}
                                        onClose={handleCloseOpportunityPane}
                                        isMobile={true}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {topCompanies.length > 0 && (
                    <div className="border-t border-border/60 pt-6 space-y-3">
                        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Top Companies Hiring</h3>
                        <div className="flex flex-wrap gap-2">
                            {topCompanies.map((company) => (
                                <Link
                                    key={company.slug}
                                    href={`/companies/${company.slug}`}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card hover:bg-primary/5 border border-border/60 hover:border-primary/20 transition-all"
                                >
                                    <CompanyLogo
                                        companyName={company.name}
                                        companyLogoUrl={company.logoUrl}
                                        companyWebsite={company.website}
                                        className="w-5 h-5 rounded"
                                    />
                                    <span className="text-xs font-semibold text-foreground">{company.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Skills & Locations — compact tag rows */}
                <PageTagLinks skills={relatedSkills} locations={relatedLocations} />

                {/* SEO Prose */}
                {seoText && (
                    <div className="pt-8 border-t border-border/50 max-w-3xl space-y-4">
                        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                            Guide to {breadcrumbLabel}
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {seoText}
                        </p>
                    </div>
                )}
            </div>

            {/* Mobile Detail Modal/Drawer (Mobile/Tablet only) */}
            {selectedOpp && isDesktop === false && (
                <div id="mobile-detail-modal" className="lg:hidden fixed inset-0 z-[120] flex flex-col bg-background animate-in slide-in-from-bottom duration-300">
                    <div className="pt-[env(safe-area-inset-top)] bg-card shrink-0" />
                    <div className="flex-1 flex flex-col min-h-0">
                        <OpportunityDetailPane
                            oppId={selectedOpp.slug || selectedOpp.id}
                            initialData={selectedOpp}
                            onClose={handleCloseOpportunityPane}
                            isMobile={true}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
