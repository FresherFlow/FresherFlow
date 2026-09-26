import { Opportunity } from '@fresherflow/types';
import { sendNewJobAlerts } from '../alerts/notification.service';
import { invalidatePublicOpportunityCache } from './publicOpportunityCache.service';
import { logger } from '@fresherflow/utils';
import { MetadataService } from './metadata.service';
import { generateAndUploadOgImage } from './ogImage.service';
import { slugify } from '@fresherflow/utils';

export function getGranularTagsForOpportunity(opportunity: Partial<Opportunity>): string[] {
  const tags: string[] = ['homepage-feed'];
  if (opportunity.company) tags.push(`company-${slugify(opportunity.company)}`);
  // Hubs are derived from independent dimensions, not one mixed `type` enum:
  //   - jobs         -> category = EMPLOYMENT
  //   - internships  -> employmentTypes contains INTERNSHIP
  //   - walk-ins     -> recruitmentMethod = WALK_IN (a drive, not a category)
  //   - government   -> sector = GOVERNMENT
  if (opportunity.category === 'EMPLOYMENT') tags.push('hub-jobs');
  if (Array.isArray(opportunity.employmentTypes) && opportunity.employmentTypes.includes('INTERNSHIP' as never)) {
    tags.push('hub-internships');
  }
  if (opportunity.recruitmentMethod === 'WALK_IN') tags.push('hub-walkins');
  if (opportunity.sector === 'GOVERNMENT') tags.push('hub-government');

  if (Array.isArray(opportunity.locations)) {
    opportunity.locations.forEach(loc => tags.push(`location-${slugify(loc)}`));
  }
  if (Array.isArray(opportunity.requiredSkills)) {
    opportunity.requiredSkills.forEach(skill => tags.push(`skill-${slugify(skill)}`));
  }
  if (Array.isArray(opportunity.allowedPassoutYears)) {
    opportunity.allowedPassoutYears.forEach(year => tags.push(`batch-${year}`));
  }
  const role = opportunity.normalizedRole || opportunity.title;
  if (role) tags.push(`role-${slugify(role)}`);
  return tags;
}

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
  /*
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

  if (isNew) {
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
  }
  */

  // 3. User alerts (Instant Email/Push/App)
  sendNewJobAlerts(opportunity.id).catch((err) => {
    logger.error('[publish] User alerts dispatch failed', { 
      opportunityId: opportunity.id, 
      error: err instanceof Error ? err.message : String(err) 
    });
  });

  // 3b. Saved-search matching (Phase 7 gate): a matching opportunity produces
  // exactly one intended notification per (user, search, opportunity) via the
  // central dispatcher (dedupeKey + dispatch log). Fire-and-forget, same policy
  // as the generic alerts above.
  import('../alerts/savedSearchAlert.service')
    .then(({ notifySavedSearchMatches }) => notifySavedSearchMatches(opportunity.id))
    .catch((err) => {
      logger.error('[publish] Saved-search alerts dispatch failed', {
        opportunityId: opportunity.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });

  // 5. Cache Invalidation
  const invalidationIds = [opportunity.id, opportunity.slug];
  if (oldSlug && oldSlug !== opportunity.slug) {
    invalidationIds.push(oldSlug);
  }

  const tags = getGranularTagsForOpportunity(opportunity);

  invalidatePublicOpportunityCache({
    idsOrSlugs: invalidationIds,
    purgeFeed: true,
    type: (opportunity.category ?? undefined) as string,
    tags,
  }).catch((err) => {
    logger.error('[publish] Cache invalidation failed', { 
      opportunityId: opportunity.id, 
      error: err instanceof Error ? err.message : String(err) 
    });
  });

  // 6. Debounced Feed Refresh
  // import('./staticFeed.service').then(({ StaticFeedService }) => {
  //   StaticFeedService.scheduleRefresh();
  // });

  // 6b. Per-job shard upload (atomic ~2.5KB object) — keeps /jobs/[slug] and
  // split-view detail panes resolvable from the CDN edge without falling back
  // to the full bootstrap feed. Fire-and-forget, same policy as OG images.
  import('./staticFeed.service')
    .then(({ StaticFeedService }) =>
      StaticFeedService.uploadSingleJob(opportunity as unknown as Record<string, unknown>)
    )
    .catch((err) => {
      logger.error('[publish] Job shard upload failed', {
        opportunityId: opportunity.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });

  // 7. Append new opportunity metadata to R2 CDN files
  MetadataService.appendOpportunityMetadata(opportunity).catch((err) => {
    logger.error('[publish] Failed to append opportunity metadata to R2', {
      opportunityId: opportunity.id,
      error: err instanceof Error ? err.message : String(err)
    });
  });

  // 8. Generate static OG image and upload to R2
  // This makes Vercel OG image routes irrelevant — zero compute for OG after this.
  // OG image for the main employment surface; competitions/scholarships are not job-shaped.
  if (isNew && opportunity.category === 'EMPLOYMENT') {
    generateAndUploadOgImage({
      id: opportunity.id,
      title: opportunity.title,
      company: opportunity.company,
        // OG renderer still takes a job-shaped label; map the new category onto it.
        type: opportunity.category === 'EMPLOYMENT' ? 'JOB' : opportunity.category,
      locations: opportunity.locations,
      expiresAt: opportunity.expiresAt instanceof Date ? opportunity.expiresAt.toISOString() : opportunity.expiresAt,
      companyLogoUrl: opportunity.companyLogoUrl,
    }).catch((err) => {
      logger.error('[publish] OG image generation failed', {
        opportunityId: opportunity.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }
}
