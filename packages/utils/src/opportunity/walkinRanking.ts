/**
 * One definition of "nearest" for walk-in drives.
 *
 * City/area first, coordinates optional. A drive without coordinates keeps a
 * null distance instead of borrowing a city-centre number and presenting it as
 * an exact venue location. Shared by the web feed and the MCP walk-in tool so
 * both rank the same list the same way.
 */
import type { WalkinLocationSignal, WalkinRankingResult } from '@fresherflow/types';
import { matchTechCluster } from './walkin-clusters.js';

export interface WalkinCandidate {
    latitude?: number | null;
    longitude?: number | null;
    city?: string | null;
    dates?: Array<string | Date> | null;
    allowedDegrees?: string[] | null;
    allowedPassoutYears?: number[] | null;
    requiredSkills?: string[] | null;
}

export interface WalkinProfileInput {
    degree?: string;
    passoutYear?: number;
    skills?: string[];
}

export type WalkinCenterSource = 'coords' | 'cluster' | 'city' | 'country';

export interface WalkinCenter {
    latitude: number;
    longitude: number;
    source: WalkinCenterSource;
}

export const CITY_FALLBACK_COORDS: Record<string, [number, number]> = {
    hyderabad: [17.385, 78.4867],
    secunderabad: [17.4399, 78.4983],
    bengaluru: [12.9716, 77.5946],
    bangalore: [12.9716, 77.5946],
    mumbai: [19.076, 72.8777],
    pune: [18.5204, 73.8567],
    delhi: [28.6139, 77.209],
    'new delhi': [28.6139, 77.209],
    noida: [28.5355, 77.391],
    gurugram: [28.4595, 77.0266],
    gurgaon: [28.4595, 77.0266],
    faridabad: [28.4089, 77.3178],
    chennai: [13.0827, 80.2707],
    kolkata: [22.5726, 88.3639],
    ahmedabad: [23.0225, 72.5714],
    surat: [21.1702, 72.8311],
    jaipur: [26.9124, 75.7873],
    lucknow: [26.8467, 80.9462],
    nagpur: [21.1458, 79.0882],
    indore: [22.7196, 75.8577],
    bhopal: [23.2599, 77.4126],
    patna: [25.5941, 85.1376],
    kochi: [9.9312, 76.2673],
    coimbatore: [11.0168, 76.9558],
    madurai: [9.9252, 78.1198],
    visakhapatnam: [17.6868, 83.2185],
    mysuru: [12.2958, 76.6394],
    mysore: [12.2958, 76.6394],
    chandigarh: [30.7333, 76.7794],
    ludhiana: [30.901, 75.8573],
    bhubaneswar: [20.2961, 85.8245],
    guwahati: [26.1445, 91.7362],
    trivandrum: [8.5241, 76.9366],
    goa: [15.2993, 74.124],
};

export const INDIA_FALLBACK_CENTER: [number, number] = [22.5937, 78.9629];

const EARTH_RADIUS_KM = 6371;
const MAX_RADIUS_KM = 500;
const MIN_RADIUS_KM = 0.5;

function isCoord(value: number | null | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function findCityCoords(text: string): [number, number] | null {
    const lower = text.toLowerCase();
    for (const [city, coords] of Object.entries(CITY_FALLBACK_COORDS)) {
        if (lower.includes(city)) return coords;
    }
    return null;
}

export function resolveWalkinCenter(signal: WalkinLocationSignal): WalkinCenter {
    if (isCoord(signal.latitude) && isCoord(signal.longitude)) {
        return {
            latitude: signal.latitude,
            longitude: signal.longitude,
            source: 'coords',
        };
    }

    const city = signal.city?.trim() || '';
    if (city) {
        const cluster = matchTechCluster(city);
        if (cluster) {
            return { latitude: cluster.latitude, longitude: cluster.longitude, source: 'cluster' };
        }
        const coords = findCityCoords(city);
        if (coords) {
            return { latitude: coords[0], longitude: coords[1], source: 'city' };
        }
    }

    return { latitude: INDIA_FALLBACK_CENTER[0], longitude: INDIA_FALLBACK_CENTER[1], source: 'country' };
}

export function haversineKm(
    a: { latitude: number; longitude: number },
    b: { latitude: number; longitude: number },
): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);
    const h = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
    return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(h));
}

function nextDriveDateMs(dates: Array<string | Date> | null | undefined): number | null {
    if (!Array.isArray(dates) || dates.length === 0) return null;
    const now = Date.now();
    const upcoming = dates
        .map((value) => new Date(value).getTime())
        .filter((ms) => Number.isFinite(ms) && ms >= now)
        .sort((a, b) => a - b);
    return upcoming[0] ?? null;
}

function hasPassed(dates: Array<string | Date> | null | undefined): boolean {
    if (!Array.isArray(dates) || dates.length === 0) return false;
    return dates.every((value) => {
        const ms = new Date(value).getTime();
        return Number.isFinite(ms) && ms < Date.now();
    });
}

export function rankWalkins<T extends WalkinCandidate>(
    drives: T[],
    signal: WalkinLocationSignal,
    profile?: WalkinProfileInput,
): Array<T & WalkinRankingResult> {
    const center = resolveWalkinCenter(signal);
    const radius = isCoord(signal.radiusKm)
        ? Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, signal.radiusKm))
        : null;

    const scored = drives.map((drive) => {
        const located = isCoord(drive.latitude) && isCoord(drive.longitude);
        const distanceKm = located
            ? haversineKm(center, { latitude: drive.latitude as number, longitude: drive.longitude as number })
            : null;
        const matchReasons: string[] = [];
        let score = 0;

        if (located) {
            score += 50;
            matchReasons.push('exact venue location');
            if (distanceKm !== null && distanceKm <= 3) matchReasons.push('within walking distance');
        }
        if (radius !== null && distanceKm !== null && distanceKm > radius) score -= 100;

        const nextDate = nextDriveDateMs(drive.dates);
        if (nextDate !== null) {
            score += 20;
            matchReasons.push('upcoming drive date');
        }
        if (hasPassed(drive.dates)) {
            score -= 30;
            matchReasons.push('dates passed');
        }

        if (profile?.passoutYear !== undefined && drive.allowedPassoutYears?.includes(profile.passoutYear)) {
            score += 10;
            matchReasons.push(`${profile.passoutYear} batch eligible`);
        }
        if (profile?.degree && drive.allowedDegrees?.some((value) => value.toLowerCase() === profile.degree?.toLowerCase())) {
            score += 10;
            matchReasons.push(`${profile.degree} eligible`);
        }
        if (profile?.skills?.length && drive.requiredSkills?.some((skill) => profile.skills?.includes(skill))) {
            score += 10;
            matchReasons.push('skill match');
        }

        return { ...drive, distanceKm, score, matchReasons };
    });

    return scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aDistance = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
        const bDistance = b.distanceKm ?? Number.MAX_SAFE_INTEGER;
        if (aDistance !== bDistance) return aDistance - bDistance;
        const aDate = nextDriveDateMs(a.dates) ?? Number.MAX_SAFE_INTEGER;
        const bDate = nextDriveDateMs(b.dates) ?? Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
    });
}
