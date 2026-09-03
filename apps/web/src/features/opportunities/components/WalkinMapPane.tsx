'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Opportunity } from '@fresherflow/types';
import {
    getOpportunityCoords,
    HYDERABAD_DEFAULT_CENTER,
    formatSalaryBadge,
    formatShortCompany,
    getDominantCity,
    parseTransitInfo,
    getTransitWalkTimeLabel,
} from '@/features/opportunities/utils/walkinMapUtils';
import { MapCanvas } from './WalkinMap/MapCanvas';

import { MapFilterHeader } from './WalkinMap/MapFilterHeader';

import { MapBottomDriveCard } from './WalkinMap/MapBottomDriveCard';
interface WalkinMapPaneProps {
    opportunity: Opportunity | null;
    opportunities?: Opportunity[];
    totalDrives?: number;
    hoveredOppId?: string | null;
    userLocation?: { latitude: number; longitude: number } | null;
    onLocationRequest?: () => void;
    onLocationClear?: () => void;
    locationLoading?: boolean;
    locationRequested?: boolean;
    locationDenied?: boolean;
    onSelectOpportunity?: (opp: Opportunity) => void;
    onClearSelection?: () => void;
    onHoverOpportunity?: (id: string | null) => void;
}

function createVenueIcon(opp: Opportunity, isSelected: boolean, isHovered: boolean): any {
    const L = (window as any).L;
    const salary = formatSalaryBadge(opp);
    const company = formatShortCompany(opp.company);
    const stateClass = isSelected ? 'state-selected' : isHovered ? 'state-hovered' : 'state-default';
    const logoUrl = opp.companyLogoUrl;
    const initial = company ? company.charAt(0).toUpperCase() : 'C';
    const transit = parseTransitInfo(opp.walkInDetails?.transitInfo);
    const transitWalkTime = getTransitWalkTimeLabel(opp.walkInDetails?.transitInfo);

    const logoHtml = logoUrl 
        ? `<img src="${logoUrl}" alt="${company}" class="venue-pill-logo" loading="lazy" />`
        : `<span class="venue-pill-initial">${initial}</span>`;
    
    // 0x0 Leaflet marker, centered via absolute + translate(-50%, -50%).
    // 36px circle keeps spiderfy legs connecting at the true center.
    const html = `
        <div class="venue-pill-wrapper ${stateClass}">
            <div class="venue-pill-circle">
                ${logoHtml}
            </div>
            <div class="venue-pill-flyout">
                <span class="venue-pill-company">${company}</span>
                ${salary ? `<span class="venue-pill-salary">&bull; ${salary}</span>` : ''}
                ${transit?.station ? `<span class="venue-pill-transit">${transit.station}${transitWalkTime ? ` · ${transitWalkTime.replace(' walk', '')}` : ''}</span>` : ''}
            </div>
        </div>
    `;

    return L.divIcon({
        html,
        className: 'walkin-venue-marker',
        iconSize: L.point(0, 0),
        iconAnchor: L.point(0, 0),
    });
}

function createClusterIcon(cluster: any): any {
    const L = (window as any).L;
    const count = cluster.getChildCount();
    const sizeClass = count < 10 ? 'size-sm' : count < 50 ? 'size-md' : 'size-lg';

    return L.divIcon({
        html: `<div class="cluster-pill-wrapper ${sizeClass}">${count}</div>`,
        className: 'walkin-cluster-marker',
        iconSize: L.point(0, 0),
        iconAnchor: L.point(0, 0),
    });
}

export function WalkinMapPane({
    opportunity,
    opportunities = [],
    totalDrives,
    hoveredOppId,
    userLocation,
    onLocationRequest,
    onLocationClear,
    locationLoading,
    locationRequested,
    locationDenied,
    onSelectOpportunity,
    onClearSelection,
    onHoverOpportunity,
}: WalkinMapPaneProps) {
    const mapRef = useRef<any>(null);
    const clusterGroupRef = useRef<any>(null);
    // Map from opp.id -> L.marker instance
    const markerMapRef = useRef<Map<string, any>>(new Map());

    const [selectedCluster, setSelectedCluster] = useState<string>('ALL');
    const [markerclusterLoaded, setMarkerclusterLoaded] = useState(false);

    // Unique tech clusters from current opportunities
    const clusters = useMemo(() => {
        const set = new Set<string>();
        opportunities.forEach((o) => {
            if (o.walkInDetails?.techCluster) {
                set.add(o.walkInDetails.techCluster.split('/')[0].trim());
            }
        });
        return Array.from(set);
    }, [opportunities]);

    const initialCenter = useMemo(() => {
        return opportunity ? getOpportunityCoords(opportunity) : HYDERABAD_DEFAULT_CENTER;
    }, []);

    const cityName = useMemo(() => getDominantCity(opportunities), [opportunities]);

    // Load Leaflet.markercluster CSS + JS after Leaflet itself is loaded
    const loadMarkerCluster = useCallback(() => {
        if ((window as any).L?.MarkerClusterGroup) {
            setMarkerclusterLoaded(true);
            return;
        }

        const cssId = 'markercluster-css';
        const cssDefaultId = 'markercluster-default-css';
        const jsId = 'markercluster-js';

        if (!document.getElementById(cssId)) {
            const link = document.createElement('link');
            link.id = cssId;
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
            document.head.appendChild(link);
        }

        if (!document.getElementById(cssDefaultId)) {
            const link = document.createElement('link');
            link.id = cssDefaultId;
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
            document.head.appendChild(link);
        }

        if (!document.getElementById(jsId)) {
            const script = document.createElement('script');
            script.id = jsId;
            script.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
            script.onload = () => setMarkerclusterLoaded(true);
            document.body.appendChild(script);
        } else {
            // Script tag exists, wait for it
            const el = document.getElementById(jsId) as HTMLScriptElement;
            if ((window as any).L?.MarkerClusterGroup) {
                setMarkerclusterLoaded(true);
            } else {
                el.addEventListener('load', () => setMarkerclusterLoaded(true));
            }
        }
    }, []);

    // Build cluster group — only when data or library changes, NOT on theme change
    useEffect(() => {
        if (!mapRef.current || !markerclusterLoaded) return;
        const L = (window as any).L;
        if (!L?.MarkerClusterGroup) return;

        // Tear down previous — guarded: clearLayers during animation throws _leaflet_id error
        if (clusterGroupRef.current) {
            try {
                clusterGroupRef.current.clearLayers();
                mapRef.current.removeLayer(clusterGroupRef.current);
            } catch {
                // Animation was mid-flight — ref replaced below regardless
            }
            clusterGroupRef.current = null;
        }
        markerMapRef.current.clear();

        const group = L.markerClusterGroup({
            disableClusteringAtZoom: 16,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            animate: true,
            maxClusterRadius: 60,
            spiderfyDistanceMultiplier: 1.2,
            iconCreateFunction: (cluster: any) => createClusterIcon(cluster),
        });

        opportunities.forEach((opp) => {
            const coords = getOpportunityCoords(opp);
            const isSelected = Boolean(opportunity && opportunity.id === opp.id);
            const isHovered = Boolean(hoveredOppId && hoveredOppId === opp.id);

            const marker = L.marker(coords, {
                icon: createVenueIcon(opp, isSelected, isHovered),
                riseOnHover: true,
                zIndexOffset: isSelected ? 1000 : 0,
            });

            marker.on('click', () => {
                onSelectOpportunity?.(opp);
                const el = document.getElementById(`job-card-${opp.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });

            marker.on('mouseover', () => onHoverOpportunity?.(opp.id));
            marker.on('mouseout', () => onHoverOpportunity?.(null));

            group.addLayer(marker);
            markerMapRef.current.set(opp.id, marker);
        });

        mapRef.current.addLayer(group);
        clusterGroupRef.current = group;

        // Add "You are here" marker if user location is available
        if (userLocation) {
            const userIcon = L.divIcon({
                html: `<div style="width:12px;height:12px;background:#3b82f6;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.2);"></div>`,
                className: 'walkin-venue-marker',
                iconSize: L.point(0, 0),
                iconAnchor: L.point(0, 0),
            });
            const userMarker = L.marker([userLocation.latitude, userLocation.longitude], {
                icon: userIcon,
                zIndexOffset: 2000,
            });
            userMarker.bindTooltip('You are here', {
                permanent: false,
                direction: 'top',
                offset: [0, -10],
                className: 'walkin-user-tooltip',
            });
            userMarker.addTo(mapRef.current);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapRef.current, markerclusterLoaded, opportunities, userLocation]);

    // Theme change is now handled 100% in globals.css via the .dark class.
    // No JS teardown is needed. We only need JS to update the hover/selection states.
    useEffect(() => {
        if (!clusterGroupRef.current) return;
        markerMapRef.current.forEach((marker, oppId) => {
            const opp = opportunities.find((o) => o.id === oppId);
            if (!opp) return;
            const isSelected = Boolean(opportunity && opportunity.id === opp.id);
            const isHovered = Boolean(hoveredOppId && hoveredOppId === opp.id);
            try {
                marker.setIcon(createVenueIcon(opp, isSelected, isHovered));
            } catch { /* marker mid-animation */ }
        });
        try { clusterGroupRef.current.refreshClusters(); } catch { /* cluster mid-animation */ }
    }, [opportunity?.id, hoveredOppId, opportunities]);

    // Navigate to selected opportunity
    useEffect(() => {
        if (!opportunity || !clusterGroupRef.current || !mapRef.current) return;
        const marker = markerMapRef.current.get(opportunity.id);
        if (!marker) return;

        try {
            // zoomToShowLayer automatically pans and zooms the map to ensure the marker is visible
            // and spiderfies the parent cluster if needed.
            // DO NOT call map.flyTo() or map.setView() here, as it will race with markercluster's
            // internal animations and crash Leaflet with a _leaflet_id undefined error.
            clusterGroupRef.current.zoomToShowLayer(marker);
        } catch {
            // Ignore if map unmounted
        }
    }, [opportunity?.id]);

    const handleSelectCluster = (cluster: string, coords?: [number, number]) => {
        setSelectedCluster(cluster);
        if (coords && mapRef.current) {
            mapRef.current.flyTo(coords, 15, { duration: 0.8 });
        }
    };

    const handleResetOverview = () => {
        setSelectedCluster('ALL');
        onClearSelection?.();
        if (mapRef.current && opportunities.length > 0) {
            const L = (window as any).L;
            if (L) {
                const coordsList = opportunities.map(getOpportunityCoords);
                mapRef.current.fitBounds(L.latLngBounds(coordsList), {
                    padding: [50, 50],
                    maxZoom: 14,
                });
            }
        }
    };

    return (
        <MapCanvas
            initialCenter={initialCenter}
            initialZoom={opportunity ? 15 : 13}
            loadingText={`Loading ${cityName} Walk-in Map...`}
            onMapReady={(map) => {
                mapRef.current = map;
                // Fit all drives into view on first load
                if (!opportunity && opportunities.length > 0) {
                    const L = (window as any).L;
                    if (L) {
                        const coordsList = opportunities.map(getOpportunityCoords);
                        map.fitBounds(L.latLngBounds(coordsList), { padding: [50, 50], maxZoom: 14 });
                    }
                }
                // Load markercluster after map is ready
                loadMarkerCluster();
            }}
            onViewportChange={() => {}}
        >
            <MapFilterHeader
                totalDrives={opportunities.length}
                clusters={clusters}
                selectedCluster={selectedCluster}
                hasSelection={Boolean(opportunity)}
                onSelectCluster={handleSelectCluster}
                onResetOverview={handleResetOverview}
                cityName={cityName}
                userLocation={userLocation}
                onLocationRequest={onLocationRequest}
                onLocationClear={onLocationClear}
                locationLoading={locationLoading}
                locationRequested={locationRequested}
                locationDenied={locationDenied}
            />
            <MapBottomDriveCard
                opportunity={opportunity}
                totalDrives={opportunities.length}
                cityName={cityName}
                onClose={handleResetOverview}
            />
        </MapCanvas>
    );
}
