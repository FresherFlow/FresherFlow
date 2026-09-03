export const MAP_TILE_CONFIG = {
    // High-speed CartoDB Voyager raster tiles for clean street and building visibility
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    fallbackUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abcd',
    maxZoom: 19,
    minZoom: 10,
    keepBuffer: 6,
    updateWhenZooming: true,
};

export const MAP_DARK_MODE_FILTER =
    'brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7) !important';
