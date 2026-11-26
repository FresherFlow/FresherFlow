import { getApiBaseUrl, apiFetch } from '../http/client.js';
import type { ConnectionIdentity } from '../identity.js';

export interface FindWalkinsInput {
  city?: string;
  q?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  withinDays?: number;
  skills?: string;
  page?: number;
  limit?: number;
}

export interface FindWalkinsResult {
  walkins: Array<Record<string, unknown>>;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Local demo only. Set through the server factory when FF_DEMO_WALKINS=true.
// Never wired from production env; the default is null and the normal HTTP
// path is used.
let demoWalkins: readonly unknown[] | null = null;

export function setDemoWalkins(rows: readonly unknown[] | null): void {
  demoWalkins = rows;
}

function toSearchParams(input: FindWalkinsInput): URLSearchParams {
  const params = new URLSearchParams();
  const add = (key: string, value: string | number | undefined) => {
    if (value !== undefined) params.set(key, String(value));
  };
  add('city', input.city);
  add('q', input.q);
  add('latitude', input.latitude);
  add('longitude', input.longitude);
  add('radiusKm', input.radiusKm);
  add('withinDays', input.withinDays);
  add('skills', input.skills);
  add('page', input.page);
  add('limit', input.limit);
  return params;
}

/**
 * One HTTP call to the typed walk-in browse route. Signed-in callers use the
 * internal surface and get profile-aware ranking; anonymous callers use the
 * rate-limited public surface. This module holds no ranking logic.
 */
export async function findWalkins(
  input: FindWalkinsInput,
  identity: ConnectionIdentity | null,
): Promise<FindWalkinsResult> {
  if (demoWalkins) {
    const all = demoWalkins as Array<Record<string, unknown>>;
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    return {
      walkins: all.slice((page - 1) * limit, page * limit),
      total: all.length,
      page,
      limit,
      hasMore: page * limit < all.length,
    };
  }

  const query = toSearchParams(input).toString();
  if (identity) {
    return apiFetch<FindWalkinsResult>(`/api/internal/mcp/walkins${query ? `?${query}` : ''}`);
  }

  const base = getApiBaseUrl();
  if (!base) throw new Error('FresherFlow API URL is not configured');
  const url = new URL('/api/public/walkins', base);
  url.search = query;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'X-Requested-From': 'fresherflow-client' },
      redirect: 'manual',
      signal: controller.signal,
    });
    if (response.status !== 200) {
      throw new Error(`FresherFlow walk-in discovery is temporarily unavailable (${response.status}).`);
    }
    return (await response.json()) as FindWalkinsResult;
  } finally {
    clearTimeout(timeoutId);
  }
}
