import prisma from '../../infrastructure/database/prisma';
import { Opportunity } from '@fresherflow/types';
import { buildOpportunityUpdateData } from '../../infrastructure/services/opportunity/opportunity.service';
import { opportunityDetailInclude } from './detail';

/**
 * Use Case: Update Opportunity.
 *
 * Guards (Phase 5):
 * - soft-deleted rows are not editable; restore first so an edit cannot
 *   silently resurrect a removed listing in the public feed
 * - authorship check stays here; org-ownership and admin-override checks
 *   live in the route layer which has membership context
 * - slug/counters/deletedAt can never be written through this path — see
 *   buildOpportunityUpdateData allowlist
 */
export async function updateOpportunity(id: string, data: Partial<Opportunity>, adminId: string) {
    const existing = await prisma.opportunity.findFirst({
        where: { id, deletedAt: null },
    });

    if (!existing) throw new Error('Opportunity not found');
    if (existing.postedByUserId !== adminId) throw new Error('Unauthorized');

    const updateData = buildOpportunityUpdateData(
        data as Record<string, unknown>,
        existing as unknown as { id: string; title: string; company: string }
    );

    return await prisma.opportunity.update({
        where: { id },
        data: updateData,
        include: { ...opportunityDetailInclude },
    });
}
