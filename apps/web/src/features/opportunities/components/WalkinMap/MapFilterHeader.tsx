'use client';

import React from 'react';
import BuildingOffice2Icon from '@heroicons/react/24/outline/BuildingOffice2Icon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';
import SignalIcon from '@heroicons/react/24/outline/SignalIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { cn } from '@repo/ui/utils/cn';
import { CLUSTER_COORDS } from '@/features/opportunities/utils/walkinMapUtils';

interface MapFilterHeaderProps {
    totalDrives: number;
    clusters: string[];
    selectedCluster: string;
    hasSelection: boolean;
    onSelectCluster: (cluster: string, coords?: [number, number]) => void;
    onResetOverview: () => void;
    cityName?: string;
    userLocation?: { latitude: number; longitude: number } | null;
    onLocationRequest?: () => void;
    onLocationClear?: () => void;
    locationLoading?: boolean;
    locationRequested?: boolean;
    locationDenied?: boolean;
}

export function MapFilterHeader({
    totalDrives,
    clusters,
    selectedCluster,
    hasSelection,
    onSelectCluster,
    onResetOverview,
    cityName,
    userLocation,
    onLocationRequest,
    onLocationClear,
    locationLoading,
    locationRequested,
    locationDenied,
}: MapFilterHeaderProps) {
    const hasLocation = Boolean(userLocation);
    const showLocate = Boolean(onLocationRequest);

    return (
        <div className="absolute top-3 left-3 right-14 z-20 flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto">
            {/* City name label */}
            {cityName && cityName !== 'India' && (
                <span className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-muted-foreground bg-background/80 backdrop-blur-md shrink-0 hidden sm:inline-flex items-center gap-1">
                    <BuildingOffice2Icon className="w-3 h-3" />
                    {cityName}
                </span>
            )}

            {/* All Drives Pill */}
            <button
                type="button"
                onClick={onResetOverview}
                className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-all backdrop-blur-md cursor-pointer shrink-0 flex items-center gap-1.5",
                    selectedCluster === 'ALL' && !hasSelection
                        ? "bg-foreground text-background"
                        : "bg-background/80 text-foreground border border-border/60 hover:bg-background"
                )}
            >
                <span>All ({totalDrives})</span>
            </button>

            {/* Tech Cluster Chips */}
            {clusters.map((cluster) => {
                const isSelected = selectedCluster === cluster;
                const coords = CLUSTER_COORDS[cluster];

                return (
                    <button
                        key={cluster}
                        type="button"
                        onClick={() => onSelectCluster(cluster, coords)}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all backdrop-blur-md cursor-pointer shrink-0 flex items-center gap-1",
                            isSelected
                                ? "bg-foreground text-background"
                                : "bg-background/80 text-foreground border border-border/60 hover:bg-background"
                        )}
                    >
                        <MapPinIcon className="w-3 h-3 text-muted-foreground" />
                        <span>{cluster}</span>
                    </button>
                );
            })}

            {/* Reset to Overview Button */}
            {hasSelection && (
                <button
                    type="button"
                    onClick={onResetOverview}
                    className="px-2.5 py-1.5 rounded-full text-xs font-medium bg-background/80 text-muted-foreground hover:text-foreground border border-border/60 backdrop-blur-md flex items-center gap-1 shrink-0 cursor-pointer"
                    title="Exit selection to full overview"
                >
                    <ArrowPathIcon className="w-3 h-3" />
                    <span>Overview</span>
                </button>
            )}

            {/* Location button — pushed to the right edge */}
            {showLocate && (
                <div className="ml-auto shrink-0">
                    {hasLocation ? (
                        <button
                            type="button"
                            onClick={onLocationClear}
                            className="px-2.5 py-1.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-300/30 backdrop-blur-md flex items-center gap-1 cursor-pointer"
                            title="Clear location"
                        >
                            <SignalIcon className="w-3 h-3" />
                            <span className="hidden sm:inline">Located</span>
                            <XMarkIcon className="w-3 h-3 text-sky-500/60" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onLocationRequest}
                            disabled={locationLoading}
                            className="px-2.5 py-1.5 rounded-full text-xs font-medium bg-background/80 text-muted-foreground hover:text-foreground border border-border/60 backdrop-blur-md flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title={locationDenied ? 'Location permission denied' : 'Enable location for nearest-first sorting'}
                        >
                            <SignalIcon className="w-3 h-3" />
                            <span className="hidden sm:inline">{locationLoading ? 'Locating...' : 'Locate me'}</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
