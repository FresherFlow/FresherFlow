import { Opportunity } from '@fresherflow/types';
import TelegramService from './telegram.service';
import { sendNewJobAlerts } from './notification.service';
import { enqueueSocialPosts } from './social/socialPost.service';
import { invalidatePublicOpportunityCache } from './publicOpportunityCache.service';
import { logger } from '@fresherflow/logger';

/**
 * Service to handle all business side-effects when an opportunity is published.
 * Consolidates Telegram, User Alerts, Social Posting, and Cache Invalidation.
 * 
 * MIRRORS ISSUE #9 in ISSUES.md: Decoupling publish effects from route handlers.
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

  // 1. Telegram Notifications (to admin/internal monitoring channels)
  TelegramService.notifyNewJob(
    opportunity.title, 
    opportunity.company, 
    opportunity.id, 
    isNew
  ).catch((err) => {
    logger.error('[publish] Telegram notify failed', { 
      opportunityId: opportunity.id, 
      error: err instanceof Error ? err.message : String(err) 
    });
  });

  // 2. Broadcast to Public Channels
  // We only broadcast if it's new (or newly published from draft)
  TelegramService.broadcastNewOpportunity(
    opportunity.id, 
    opportunity.title, 
    opportunity.company, 
    opportunity.type, 
    opportunity.locations, 
    opportunity.slug
  ).catch((err) => {
    logger.error('[publish] Telegram broadcast failed', { 
      opportunityId: opportunity.id, 
      error: err instanceof Error ? err.message : String(err) 
    });
  });

  // 3. User alerts (Instant Email/Push/App)
  sendNewJobAlerts(opportunity.id).catch((err) => {
    logger.error('[publish] User alerts dispatch failed', { 
      opportunityId: opportunity.id, 
      error: err instanceof Error ? err.message : String(err) 
    });
  });

  // 4. Social Posting (X, LinkedIn, Facebook)
  enqueueSocialPosts(opportunity).catch((err) => {
    logger.error('[publish] Social posting enqueue failed', { 
      opportunityId: opportunity.id, 
      error: err instanceof Error ? err.message : String(err) 
    });
  });

  // 5. Cache Invalidation
  const invalidationIds = [opportunity.id, opportunity.slug];
  if (oldSlug && oldSlug !== opportunity.slug) {
    invalidationIds.push(oldSlug);
  }

  invalidatePublicOpportunityCache({
    idsOrSlugs: invalidationIds,
    purgeFeed: true
  }).catch((err) => {
    logger.error('[publish] Cache invalidation failed', { 
      opportunityId: opportunity.id, 
      error: err instanceof Error ? err.message : String(err) 
    });
  });
}
