'use server';

import { cookies, headers } from 'next/headers';
import { ApiClient, getInferredAdminBaseUrl } from '@fresherflow/api-client';
import { ADMIN_WEB_HOST } from '@/lib/utils/runtimeConfig';
import { revalidatePath } from 'next/cache';
import { Opportunity } from '@fresherflow/types';

async function getClient() {
    const cookieStore = await cookies();
    const headersStore = await headers();
    const host = headersStore.get('host') || ADMIN_WEB_HOST;
    const proto = headersStore.get('x-forwarded-proto') || 'https';

    return new ApiClient(getInferredAdminBaseUrl(), undefined, {
        defaultHeaders: {
            'Cookie': cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; '),
            'X-Requested-From': 'fresherflow-web',
            'Origin': `${proto}://${host}`,
            'X-Forwarded-Host': host
        }
    });
}

export interface CreateOpportunityPayload extends Partial<Opportunity> {
     
    walkInDetails?: any;
}

export async function createOpportunityAction(data: CreateOpportunityPayload) {
    try {
        const client = await getClient();
        await client.request('/api/admin/opportunities', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        revalidatePath('/admin/opportunities');
        return { success: true };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function updateOpportunityAction(id: string, data: Partial<Opportunity>) {
    try {
        const client = await getClient();
        await client.request(`/api/admin/opportunities/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        revalidatePath('/admin/opportunities');
        revalidatePath(`/admin/opportunities/edit/${id}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function expireOpportunityAction(id: string) {
    try {
        const client = await getClient();
        await client.request(`/api/admin/opportunities/${id}/expire`, {
            method: 'POST',
        });
        revalidatePath('/admin/opportunities');
        return { success: true };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function deleteOpportunityAction(id: string, reason: string = 'Deleted by admin') {
    try {
        const client = await getClient();
        await client.request(`/api/admin/opportunities/${id}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason }),
        });
        revalidatePath('/admin/opportunities');
        return { success: true };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function bulkOpportunityAction(
    ids: string[],
    action: 'DELETE' | 'ARCHIVE' | 'PUBLISH' | 'EXPIRE',
    reason?: string
) {
    try {
        const client = await getClient();
        const response = await client.request<{ 
            action: string; 
            requestedCount: number; 
            updatedCount: number; 
            skippedCount: number; 
            message?: string; 
        }>('/api/admin/opportunities/bulk', {
            method: 'POST',
            body: JSON.stringify({ ids, action, reason }),
        });
        revalidatePath('/admin/opportunities');
        return {
            success: true,
            action: response.action,
            requestedCount: response.requestedCount,
            updatedCount: response.updatedCount,
            skippedCount: response.skippedCount,
            message: response.message,
        };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function restoreOpportunityAction(id: string) {
    try {
        const client = await getClient();
        await client.request(`/api/admin/opportunities/${id}/restore`, {
            method: 'POST',
        });
        revalidatePath('/admin/opportunities');
        return { success: true };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}





