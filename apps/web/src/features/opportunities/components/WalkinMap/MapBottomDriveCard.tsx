'use client';

import React from 'react';
import { Opportunity } from '@fresherflow/types';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
import { useRouter } from 'next/navigation';
import { getOpportunityPathFromItem } from '@/features/opportunities/domain/opportunityPath';
import {
    getGoogleCalendarUrl,
    getWhatsAppShareUrl,
    parseTransitInfo,
    getTransitDirectionsUrl,
} from '@/features/opportunities/utils/walkinMapUtils';

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
                <div className="px-4 py-2.5 bg-background/95 dark:bg-card/95 backdrop-blur-xl border border-border/60 shadow-sm rounded-xl flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-semibold">{totalDrives}</span>
                        <span className="text-muted-foreground">drives in {cityName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                        Click a pin for details
                    </span>
                </div>
            </div>
        );
    }

    const d = opportunity.walkInDetails;
    const dest =
        d?.latitude && d?.longitude
            ? `${d.latitude},${d.longitude}`
            : d?.venueAddress || '';
    const directionsUrl = getTransitDirectionsUrl(opportunity);
    const transit = parseTransitInfo(d?.transitInfo);

    return (
        <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-auto">
            <div className="bg-background/95 dark:bg-card/95 backdrop-blur-xl border border-border/60 shadow-md rounded-xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
                {/* Header: company + role + close */}
                <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-foreground">{opportunity.company}</span>
                            {d?.techCluster && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                                    {d.techCluster}
                                </span>
                            )}
                        </div>
                        <h3 className="text-[13px] font-semibold text-foreground leading-snug line-clamp-1 mt-0.5">
                            {opportunity.normalizedRole || opportunity.title}
                        </h3>
                        {d?.venueAddress && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{d.venueAddress}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
                        aria-label="Close"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* Info line: date, time, transit — only if any exist */}
                {(d?.dateRange || d?.timeRange || d?.reportingTime || transit?.station) && (
                    <div className="flex flex-wrap items-center gap-2 px-4 pb-2 text-xs text-muted-foreground">
                        {d?.dateRange && <span>{d.dateRange}</span>}
                        {(d?.timeRange || d?.reportingTime) && (
                            <span>{d.timeRange || d.reportingTime}</span>
                        )}
                        {transit?.station && (
                            <span className="text-violet-600 dark:text-violet-400">
                                {transit.station}
                                {transit.walkDistance && ` · ${transit.walkDistance}`}
                            </span>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 px-4 pb-3 border-t border-border/40 pt-2.5">
                    <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                    >
                        Directions
                        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                    </a>
                    <a
                        href={getWhatsAppShareUrl(opportunity)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors"
                    >
                        Share
                    </a>
                    <a
                        href={getGoogleCalendarUrl(opportunity)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors"
                    >
                        Calendar
                    </a>
                    <button
                        type="button"
                        onClick={() => router.push(getOpportunityPathFromItem(opportunity))}
                        className="ml-auto px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors cursor-pointer"
                    >
                        View Details
                    </button>
                </div>
            </div>
        </div>
    );
}
