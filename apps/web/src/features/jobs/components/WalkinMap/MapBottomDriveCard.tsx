'use client';

import React from 'react';
import { Opportunity } from '@fresherflow/types';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
import { useRouter } from 'next/navigation';
import { getOpportunityPathFromItem } from '@/features/jobs/domain/opportunityPath';
import { getTransitDirectionsUrl, getDriveDetails } from '@/features/jobs/utils/walkinMapUtils';

interface MapBottomDriveCardProps {
    opportunity: Opportunity | null;
    totalDrives: number;
    cityName?: string;
    onClose: () => void;
}

export function MapBottomDriveCard({
    opportunity,
    totalDrives,
    cityName = 'India',
    onClose,
}: MapBottomDriveCardProps) {
    const router = useRouter();

    if (!opportunity) {
        return (
            <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-auto">
                <div className="px-4 py-2.5 bg-background/95 dark:bg-card/95 backdrop-blur-xl border border-border/60 rounded-xl flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                        <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                        <span className="font-semibold">{totalDrives}</span>
                        <span className="text-muted-foreground">drive{totalDrives === 1 ? '' : 's'} in {cityName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                        Tap a pin to see the drive
                    </span>
                </div>
            </div>
        );
    }

    const d = getDriveDetails(opportunity);
    const venue = d?.venueAddress?.trim();
    const city = opportunity.locations?.[0]?.trim();
    const hasExactPlace = Boolean(venue || (d?.latitude != null && d?.longitude != null));
    const directionsUrl = getTransitDirectionsUrl(opportunity);

    return (
        <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-auto">
            <div className="bg-background/95 dark:bg-card/95 backdrop-blur-xl border border-border/60 rounded-xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-foreground">{opportunity.company}</span>
                            {d?.techCluster && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                                    {d.techCluster}
                                </span>
                            )}
                        </div>
                        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-1 mt-0.5">
                            {opportunity.normalizedRole || opportunity.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {venue || (city ? `${city} · venue not shared` : 'Venue not shared')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
                        aria-label="Close drive details"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* One action, named honestly. Calendar/Share/Directions on an
                    undated drive with no venue were guessing for the reader. */}
                <div className="flex items-center gap-2 px-4 pb-3 pt-1">
                    {hasExactPlace && (
                        <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium flex items-center gap-1.5 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted transition-colors"
                        >
                            Directions
                            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                        </a>
                    )}
                    <button
                        type="button"
                        onClick={() => router.push(getOpportunityPathFromItem(opportunity))}
                        className="ml-auto px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold cursor-pointer"
                    >
                        View full details
                    </button>
                </div>
            </div>
        </div>
    );
}
