import { NextRequest, NextResponse } from 'next/server';
import { CDN_URL } from '@/lib/utils/runtimeConfig';
import fs from 'fs/promises';
import path from 'path';

export interface CollegeItem {
    id?: string;
    name: string;
    district?: string;
    type?: string;
    state?: string;
}

const INDIAN_STATE_SLUGS = [
    'andhra-pradesh', 'telangana', 'karnataka', 'tamil-nadu', 'maharashtra',
    'delhi', 'uttar-pradesh', 'west-bengal', 'gujarat', 'kerala',
    'rajasthan', 'madhya-pradesh', 'punjab', 'haryana', 'bihar', 'odisha',
    'assam', 'chhattisgarh', 'jharkhand', 'uttarakhand', 'himachal-pradesh'
];

const stateCache = new Map<string, CollegeItem[]>();

function slugifyState(stateName: string): string {
    return stateName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getAcronym(name: string): string {
    const stopWords = new Set(['of', 'and', 'in', 'for', 'the', 'at', '&']);
    const words = name
        .split(/[\s,-]+/)
        .filter((w) => w.length > 0 && !stopWords.has(w.toLowerCase()));
    return words.map((w) => w[0]).join('').toLowerCase();
}

async function loadCollegesForSlug(slug: string): Promise<CollegeItem[]> {
    if (stateCache.has(slug)) {
        return stateCache.get(slug)!;
    }

    let list: CollegeItem[] = [];

    try {
        const cdnUrl = `${CDN_URL}/api/colleges/${slug}.json`;
        const res = await fetch(cdnUrl, { next: { revalidate: 86400 } });
        if (res.ok) {
            const json = await res.json();
            list = Array.isArray(json) ? json : json.colleges || [];
        }
    } catch {
        // Fallback to local disk file if CDN fails
    }

    if (list.length === 0) {
        try {
            const localPath = path.join(process.cwd(), '../../colleges', `${slug}.json`);
            const fileData = await fs.readFile(localPath, 'utf-8');
            const json = JSON.parse(fileData);
            list = Array.isArray(json) ? json : json.colleges || [];
        } catch {
            list = [];
        }
    }

    stateCache.set(slug, list);
    return list;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const stateParam = searchParams.get('state') || '';
    const limitParam = parseInt(searchParams.get('limit') || '15', 10);
    const limit = Number.isNaN(limitParam) || limitParam <= 0 ? 15 : limitParam;

    let targetSlugs: string[] = [];

    if (stateParam) {
        targetSlugs = [slugifyState(stateParam)];
    } else {
        targetSlugs = INDIAN_STATE_SLUGS;
    }

    // Parallel fetch from in-memory cache or CDN/disk
    const allLists = await Promise.all(targetSlugs.map((s) => loadCollegesForSlug(s)));
    const allColleges = allLists.flat();

    if (!q) {
        return NextResponse.json(allColleges.slice(0, limit));
    }

    // Search & Rank
    const scoredItems: Array<{ item: CollegeItem; score: number }> = [];

    for (const col of allColleges) {
        const nameLower = col.name.toLowerCase();
        const districtLower = col.district ? col.district.toLowerCase() : '';
        const acronym = getAcronym(col.name);

        let score = 0;

        if (nameLower.startsWith(q)) {
            score = 100;
        } else if (acronym === q) {
            score = 95;
        } else if (acronym.startsWith(q)) {
            score = 85;
        } else if (nameLower.includes(q)) {
            score = 70;
        } else if (districtLower.startsWith(q) || districtLower.includes(q)) {
            score = 40;
        }

        if (score > 0) {
            scoredItems.push({ item: col, score });
        }
    }

    scoredItems.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
    const results = scoredItems.slice(0, limit).map((s) => s.item);

    return NextResponse.json(results);
}
