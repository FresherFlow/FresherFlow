import prisma from '../../infrastructure/database/prisma';
import { OpportunityStatus, Opportunity } from '@fresherflow/types';
import TelegramService from '../../infrastructure/services/telegram.service';
import { sendNewJobAlerts } from '../../application/notifications/instant';
import { enqueueSocialPosts } from '../../infrastructure/services/social/socialPost.service';
import { invalidatePublicOpportunityCache } from '../../infrastructure/services/publicOpportunityCache.service';
import { logger } from '@fresherflow/logger';

/**
 * Use Case: Publish Opportunity (DRAFT → ACTIVE)
 */
export async function publishOpportunity(id: string, adminId: string) {
    const opportunity = await prisma.opportunity.findUnique({
        where: { id },
    });

    if (!opportunity) throw new Error('Opportunity not found');
    if (opportunity.postedByUserId !== adminId) throw new Error('Unauthorized');
    if (opportunity.status !== OpportunityStatus.DRAFT) {
        throw new Error('Can only publish draft opportunities');
    }

    const updated = await prisma.opportunity.update({
        where: { id },
        data: {
            status: OpportunityStatus.PUBLISHED,
            lastVerified: new Date(),
        },
    });

    // Dispatch side-effects (Decoupled from routes handlers)
    await handleOpportunityPublished(updated as unknown as Opportunity, { isNew: true });

    return updated;
}

/**
 * Handles all business side-effects when an opportunity is published.
 * Consolidates Telegram, User Alerts, Social Posting, and Cache Invalidation.
 */
export async function handleOpportunityPublished(
  opportunity: Opportunity, 
  options: { isNew?: boolean, oldSlug?: string } = {}
) {
  const { isNew = true, oldSlug } = options;

  logger.info('[publish] Handling publish side-effects', { 
    opportunityId: opportunity.id, 
    isNew, 
    slug: opportunity.slug 
  });

  TelegramService.notifyNewJob(opportunity.title, opportunity.company, opportunity.id, isNew).catch(err => logger.error('[publish] Telegram notify failed', { error: err }));
  TelegramService.broadcastNewOpportunity(opportunity.id, opportunity.title, opportunity.company, opportunity.type, opportunity.locations, opportunity.slug).catch(err => logger.error('[publish] Telegram broadcast failed', { error: err }));
  sendNewJobAlerts(opportunity.id).catch(err => logger.error('[publish] User alerts failed', { error: err }));
  enqueueSocialPosts(opportunity).catch(err => logger.error('[publish] Social posting failed', { error: err }));

  const invalidationIds = [opportunity.id, opportunity.slug];
  if (oldSlug && oldSlug !== opportunity.slug) invalidationIds.push(oldSlug);

  invalidatePublicOpportunityCache({ idsOrSlugs: invalidationIds, purgeFeed: true }).catch(err => logger.error('[publish] Cache invalidation failed', { error: err }));
}
