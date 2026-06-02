'use server';

import { serverApiClient } from '@/lib/api/server-client';
import { revalidatePath } from 'next/cache';
import { Opportunity } from '@fresherflow/types';

export interface CreateOpportunityPayload extends Partial<Opportunity> {
     
    walkInDetails?: any;
    // Add other properties that might be on payload but not on Opportunity type
}

export async function createOpportunityAction(data: CreateOpportunityPayload) {
    'use server';
    try {
        await serverApiClient('/api/admin/opportunities', {
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
    'use server';
    try {
        await serverApiClient(`/api/admin/opportunities/${id}`, {
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
    'use server';
    try {
        await serverApiClient(`/api/admin/opportunities/${id}/expire`, {
            method: 'POST',
        });
        revalidatePath('/admin/opportunities');
        return { success: true };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function deleteOpportunityAction(id: string, reason: string = 'Deleted by admin') {
    'use server';
    try {
        await serverApiClient(`/api/admin/opportunities/${id}`, {
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
    'use server';
    try {
        const response = await serverApiClient('/api/admin/opportunities/bulk', {
            method: 'POST',
            body: JSON.stringify({ ids, action, reason }),
        });
        revalidatePath('/admin/opportunities');
        return {
            success: true,
            action: response.action as string,
            requestedCount: Number(response.requestedCount || ids.length),
            updatedCount: Number(response.updatedCount || 0),
            skippedCount: Number(response.skippedCount || 0),
            message: response.message as string | undefined,
        };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function restoreOpportunityAction(id: string) {
    'use server';
    try {
        await serverApiClient(`/api/admin/opportunities/${id}/restore`, {
            method: 'POST',
        });
        revalidatePath('/admin/opportunities');
        return { success: true };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}
