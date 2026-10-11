import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/api/rateLimit';
import { fetchSkillsMetadata, fetchCompaniesMetadata, fetchEducationMetadata } from '@/lib/api/cdnFeed';
import { CONTROLLED_TAGS } from '@fresherflow/constants';
import { CITIES_METADATA_URL } from '@/lib/utils/runtimeConfig';

export const revalidate = false;
export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
    'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
} as const;

type MetaKind = 'skills' | 'cities' | 'companies' | 'courses' | 'tags';

function normalizeStrings(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    for (const item of raw) {
        if (typeof item === 'string') {
            const v = item.trim();
            if (v) out.push(v);
        } else if (item && typeof item === 'object') {
            const rec = item as Record<string, unknown>;
            const v = [rec.name, rec.city, rec.title, rec.label].find(
                (x): x is string => typeof x === 'string' && x.trim().length > 0,
            );
            if (v) out.push(v.trim());
        }
        if (out.length >= 5000) break;
    }
    return Array.from(new Set(out));
}

async function fetchCities(): Promise<string[]> {
    try {
        const res = await fetch(CITIES_METADATA_URL, {
            next: { revalidate: 300, tags: ['cities-metadata'] },
        });
        if (!res.ok) return [];
        return normalizeStrings(await res.json());
    } catch {
        return [];
    }
}

/**
 * GET /api/public/meta?kind=skills|cities|companies|courses|tags&q=&limit=
 *
 * Same-origin typeahead vocabulary for the contribute sheet. The CDN metadata
 * fetchers are server-only, so the browser goes through here; responses are
 * plain string lists, safe to cache publicly. Never throws: empty list on
 * any failure so the form degrades to free text.
 */
async function serveMeta(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const kind = (params.get('kind') || '').toLowerCase() as MetaKind;
    const q = (params.get('q') || '').trim().toLowerCase();
    const limit = Math.min(Math.max(parseInt(params.get('limit') || '30', 10) || 30, 1), 100);

    let list: string[] = [];
    if (kind === 'skills') {
        list = (await fetchSkillsMetadata()) ?? [];
    } else if (kind === 'companies') {
        list = ((await fetchCompaniesMetadata()) ?? []).map((c) => c.name).filter(Boolean);
    } else if (kind === 'cities') {
        list = await fetchCities();
    } else if (kind === 'courses') {
        // education.json: levels + per-level course lists + specializations.
        const edu = await fetchEducationMetadata();
        list = edu
            ? normalizeStrings([
                ...edu.educationLevels,
                ...Object.values(edu.courses).flat(),
                ...Object.values(edu.specializations).flat(),
            ])
            : [];
    } else if (kind === 'tags') {
        // Static controlled vocabulary (@fresherflow/constants) — no fetch,
        // so this kind works even when the CDN is unreachable.
        list = normalizeStrings([
            ...CONTROLLED_TAGS.BATCHES,
            ...CONTROLLED_TAGS.ROLES,
            ...CONTROLLED_TAGS.LOCATIONS,
            ...CONTROLLED_TAGS.SKILLS,
        ]);
    } else {
        return NextResponse.json({ success: false, error: 'kind must be skills, cities, companies, courses, or tags' }, { status: 400, headers: CACHE_HEADERS });
    }

    const filtered = q
        ? list.filter((v) => v.toLowerCase().includes(q)).slice(0, limit)
        : list.slice(0, limit);
    return NextResponse.json({ success: true, data: filtered }, { headers: CACHE_HEADERS });
}

export const GET = withRateLimit(serveMeta, { windowMs: 60_000, max: 120, keyPrefix: 'public-meta' });
