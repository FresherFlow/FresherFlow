'use client';

import React, { useEffect, useRef, useState } from 'react';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import { MAP_TILE_CONFIG } from '@/features/jobs/utils/mapTileConfig';
import { INDIA_FALLBACK_CENTER } from '@/features/jobs/utils/walkinMapUtils';

interface MapCanvasProps {
    initialCenter?: [number, number];
    initialZoom?: number;
    loadingText?: string;
    onMapReady: (map: any) => void;
    onViewportChange: (bounds: [number, number, number, number], zoom: number) => void;
    children?: React.ReactNode;
}

export function MapCanvas({
    initialCenter = INDIA_FALLBACK_CENTER,
    initialZoom = 12,
    loadingText = 'Loading Walk-in Map...',
    onMapReady,
    onViewportChange,
    children,
}: MapCanvasProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const [leafletLoaded, setLeafletLoaded] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [reloadKey, setReloadKey] = useState<number>(0);

    // 1. Load Leaflet script & CSS
    useEffect(() => {
        if (typeof window === 'undefined') return;

        if ((window as any).L) {
            setLeafletLoaded(true);
            return;
        }

        const linkId = 'leaflet-css-v194';
        if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            link.crossOrigin = '';
            document.head.appendChild(link);
        }

        const scriptId = 'leaflet-js-v194';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.crossOrigin = '';
            script.onload = () => setLeafletLoaded(true);
            script.onerror = () => setLoadError(true);
            document.body.appendChild(script);
        } else {
            const el = document.getElementById(scriptId) as HTMLScriptElement;
            el.addEventListener('load', () => setLeafletLoaded(true));
        }

        const timeout = setTimeout(() => {
            if (!(window as any).L) {
                setLoadError(true);
            }
        }, 5000);

        return () => clearTimeout(timeout);
    }, [reloadKey]);

    // 2. Initialize Leaflet Map Instance
    useEffect(() => {
        if (!leafletLoaded || !mapContainerRef.current || mapInstanceRef.current) return;
        const L = (window as any).L;
        if (!L) return;

        const map = L.map(mapContainerRef.current, {
            center: initialCenter,
            zoom: initialZoom,
            minZoom: 10,
            maxZoom: 18,
            zoomControl: false,
            attributionControl: false,
        });

        L.control.zoom({ position: 'topright' }).addTo(map);

        // Persistent high-performance Voyager tiles
        const tiles = L.tileLayer(MAP_TILE_CONFIG.url, {
            maxZoom: MAP_TILE_CONFIG.maxZoom,
            minZoom: MAP_TILE_CONFIG.minZoom,
            subdomains: MAP_TILE_CONFIG.subdomains,
            keepBuffer: MAP_TILE_CONFIG.keepBuffer,
            updateWhenZooming: MAP_TILE_CONFIG.updateWhenZooming,
        }).addTo(map);

        tiles.on('tileerror', () => {
            tiles.setUrl(MAP_TILE_CONFIG.fallbackUrl);
        });

        mapInstanceRef.current = map;
        setMapReady(true);
        onMapReady(map);

        const reportViewport = () => {
            const b = map.getBounds();
            const westLng = b.getWest();
            const southLat = b.getSouth();
            const eastLng = b.getEast();
            const northLat = b.getNorth();
            const currentZoom = map.getZoom();
            onViewportChange([westLng, southLat, eastLng, northLat], currentZoom);
        };

        // Report initial viewport
        reportViewport();

        map.on('moveend', reportViewport);
        map.on('zoomend', reportViewport);

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, [leafletLoaded, reloadKey]);

    const handleReloadMap = () => {
        setLoadError(false);
        setMapReady(false);
        setReloadKey((prev) => prev + 1);
    };

    return (
        <div className="relative flex-1 w-full h-full min-h-100 overflow-hidden bg-background">
            {/* Leaflet's own chrome is styled through theme tokens, not raw hex.
                The tokens already flip under `.dark`, so each light/dark pair
                below collapses into ONE rule that stays correct in both modes.
                Previously every surface carried two hardcoded hex values that
                had to be edited by hand in lockstep. Only the tile-pane filter
                stays dark-scoped: it inverts raster map tiles, not a colour. */}
            <style jsx global>{`
                .leaflet-container {
                    background-color: var(--color-background) !important;
                    font-family: inherit !important;
                }
                .dark .leaflet-tile-pane {
                    filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7) !important;
                }
                .custom-map-marker {
                    background: transparent !important;
                    border: none !important;
                    width: 0 !important;
                    height: 0 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                .leaflet-control-zoom {
                    border: 1px solid var(--color-border) !important;
                    border-radius: 12px !important;
                    overflow: hidden;
                    box-shadow: oklch(from var(--color-foreground) l c h / 0.15) !important;
                }
                .leaflet-control-zoom a {
                    background-color: var(--color-card) !important;
                    color: var(--color-foreground) !important;
                    border-bottom: 1px solid var(--color-border) !important;
                }
                .leaflet-control-zoom a:hover {
                    background-color: var(--color-muted) !important;
                }
            `}</style>

            {/* Map Canvas Container */}
            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

            {/* Loading Placeholder */}
            {!mapReady && !loadError && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
                    <p className="text-xs text-muted-foreground font-medium">{loadingText}</p>
                </div>
            )}

            {/* Isolated Error Fallback */}
            {loadError && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-card text-center">
                    <MapPinIcon className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-semibold text-foreground">Map preview unavailable</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                        You can still browse all active walk-in drives and open directions in Google Maps.
                    </p>
                    <button
                        type="button"
                        onClick={handleReloadMap}
                        className="mt-3 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold cursor-pointer"
                    >
                        Reload Map
                    </button>
                </div>
            )}

            {children}
        </div>
    );
}
