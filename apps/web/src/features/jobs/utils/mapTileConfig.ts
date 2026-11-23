export const MAP_TILE_CONFIG = {
    // CartoDB's public raster tiles now return an "API KEY REQUIRED" watermark
    // image instead of a real tile. Leaflet sees a successful image response, so
    // `tileerror` never fires and the fallback never engaged — the split map
    // looked alive but showed a repeated watermark. OpenStreetMap's raster
    // tiles are keyless, so use them as the primary source. Dark mode is handled
    // by MAP_DARK_MODE_FILTER on the tile pane, not by a second tile provider.
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    fallbackUrl: 'https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    // OSM serves a, b and c subdomains — not d.
    subdomains: 'abc',
    maxZoom: 19,
    minZoom: 10,
    keepBuffer: 6,
    updateWhenZooming: true,
};

export const MAP_DARK_MODE_FILTER =
    'brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7) !important';
