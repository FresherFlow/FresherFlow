'use server';

import { cookies, headers } from 'next/headers';
import { ApiClient, getInferredBaseUrl } from '@fresherflow/api-client';
import type { MySubmissionsResult } from '@fresherflow/types';

async function getClient() {
    const cookieStore = await cookies();
    const headersStore = await headers();
    const host = headersStore.get('host');
    const proto = headersStore.get('x-forwarded-proto') || 'https';

    return new ApiClient(getInferredBaseUrl(), undefined, {
        defaultHeaders: {
            Cookie: cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; '),
            'X-Requested-From': 'fresherflow-web',
            Origin: `${proto}://${host}`,
            'X-Forwarded-Host': host || '',
        },
    });
}

/**
 * Dashboard submission count — owned by features/dashboard.
 * Moved out of the /submit route (server actions must not live
 * inside a single route's folder).
 */
export async function getSubmissionHistoryAction(): Promise<
    { submissions: MySubmissionsResult['submissions'] } | { error: string }
> {
    try {
        const client = await getClient();
        const result = await client.request<MySubmissionsResult>('/api/jobs/submissions/mine');
        return { submissions: result.submissions };
    } catch {
        return { error: 'Could not load your submissions. Try again in a moment.' };
    }
}
