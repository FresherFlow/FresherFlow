import { prisma } from '@fresherflow/database';
import { SocialPlatform, SocialPostStatus } from '@prisma/client';
import { OpportunityType } from '@fresherflow/types';

import { buildCaption } from './caption.service';
import { enqueueSocialPost } from '@fresherflow/queue';
import { buildSocialOpportunityUrl } from '../../../utils/share';
import { getPublicSiteUrl } from '../../../utils/runtimeConfig';
import { getAdminDeliveryControls } from '../adminDeliveryControl.service';

/** Minimal interface for social posting logic to avoid tight coupling */
export interface SocialOpportunity {
  id: string;
  title: string;
  company: string;
  type: OpportunityType;
  locations: string[];
  applyLink?: string | null;
  sourceLink?: string | null;
  salaryRange?: string | null;
  slug: string;
}

const PLATFORM_ENV: Record<SocialPlatform, string> = {
  X: 'SOCIAL_X_ENABLED',
  LINKEDIN: 'SOCIAL_LINKEDIN_ENABLED',
  FACEBOOK: 'SOCIAL_FACEBOOK_ENABLED',
};

function getPlatformDisabledState(platform: SocialPlatform, socialAutoPostingEnabled: boolean): 'disabled_by_admin' | 'disabled_by_env' | null {
  if (!socialAutoPostingEnabled) return 'disabled_by_admin';
  if (process.env.SOCIAL_AUTO_POST_ENABLED !== 'true') return 'disabled_by_env';
  if (process.env[PLATFORM_ENV[platform]] !== 'true') return 'disabled_by_env';
  return null;
}

/**
 * Handle individual platform posting by creating a record and enqueuing a background job.
 * This follows the "Telegram Thing" pattern for reliability and retries.
 */
async function postOnePlatform(
  opportunity: SocialOpportunity,
  platform: SocialPlatform,
  socialAutoPostingEnabled: boolean,
): Promise<void> {
  const dedupeKey = `${platform}:${opportunity.id}`;

  const baseUrl = (process.env.FRONTEND_URL?.replace(/\/$/, '') || getPublicSiteUrl());
  
  // Use the standardized share utility (Issue #7 cleanup)
  const socialLink = buildSocialOpportunityUrl({
    frontendOrigin: baseUrl,
    slug: opportunity.slug,
    platform: platform === 'LINKEDIN' ? 'linkedin' : platform === 'X' ? 'x' : 'facebook',
    type: opportunity.type,
  });

  const text = buildCaption(
    {
      title: opportunity.title,
      company: opportunity.company,
      type: opportunity.type,
      locations: opportunity.locations,
      applyLink: socialLink,
      salaryRange: opportunity.salaryRange,
    },
    platform,
  );

  const existing = await prisma.socialPost.findUnique({ where: { dedupeKey } });

  const disabledState = getPlatformDisabledState(platform, socialAutoPostingEnabled);

  if (disabledState) {
    if (!existing) {
      await prisma.socialPost.create({
        data: {
          platform,
          opportunityId: opportunity.id,
          dedupeKey,
          status: SocialPostStatus.DISABLED,
          payload: { text, configState: disabledState },
        }
      });
    } else {
      await prisma.socialPost.update({
        where: { id: existing.id as string },
        data: {
          payload: { ...(typeof existing.payload === 'object' && existing.payload ? existing.payload : {}), text, configState: disabledState },
          status: SocialPostStatus.DISABLED,
        }
      });
    }
    return;
  }

  // Atomically create or update to PENDING status
  const record = await prisma.socialPost.upsert({
    where: { dedupeKey },
    update: { 
      payload: { ...(typeof existing?.payload === 'object' && existing.payload ? existing.payload : {}), text, configState: 'enabled' },
      status: SocialPostStatus.PENDING,
      retryCount: { increment: 1 }
    },
    create: { 
      platform, 
      opportunityId: opportunity.id, 
      dedupeKey, 
      payload: { text, configState: 'enabled' },
      status: SocialPostStatus.PENDING,
      retryCount: 1
    },
  });

  if (record.status === SocialPostStatus.PUBLISHED) {
     return;
  }

  // Enqueue for background processing (The "Hurdle-proof" Worker Thing)
  await enqueueSocialPost({ socialPostId: record.id as string });
}

export async function enqueueSocialPosts(opportunity: SocialOpportunity): Promise<void> {
  const deliveryControls = await getAdminDeliveryControls();
  const platforms: SocialPlatform[] = ['X', 'LINKEDIN', 'FACEBOOK'];
  await Promise.allSettled(platforms.map((p) => postOnePlatform(opportunity, p, deliveryControls.socialAutoPostingEnabled)));
}

export async function retrySocialPost(socialPostId: string): Promise<void> {
  const post = await prisma.socialPost.findUniqueOrThrow({
    where: { id: socialPostId },
    include: { opportunity: true },
  });

  // Re-enqueue the existing record
  await prisma.socialPost.update({
    where: { id: socialPostId },
    data: { status: SocialPostStatus.PENDING }
  });

  await enqueueSocialPost({ socialPostId: post.id as string });
}

export async function listSocialPosts(params: {
  platform?: SocialPlatform;
  status?: SocialPostStatus;
  page?: number;
}) {
  const { platform, status, page = 1 } = params;
  const pageSize = 20;
  const where = {
    ...(platform ? { platform } : {}),
    ...(status ? { status } : {}),
  };

  const [posts, total, grouped] = await Promise.all([
    prisma.socialPost.findMany({
      where,
      include: { opportunity: { select: { id: true, title: true, company: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.socialPost.count({ where }),
    prisma.socialPost.groupBy({
      where,
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const summary = {
    pending: 0,
    published: 0,
    failed: 0,
    disabled: 0,
    dryRun: 0,
  };

  for (const row of grouped) {
    if (row.status === SocialPostStatus.PENDING) summary.pending = row._count._all;
    if (row.status === SocialPostStatus.PUBLISHED) summary.published = row._count._all;
    if (row.status === SocialPostStatus.FAILED) summary.failed = row._count._all;
    if (row.status === SocialPostStatus.DISABLED) summary.disabled = row._count._all;
    if (row.status === SocialPostStatus.DRY_RUN) summary.dryRun = row._count._all;
  }

  return {
    posts,
    total,
    summary,
  };
}
