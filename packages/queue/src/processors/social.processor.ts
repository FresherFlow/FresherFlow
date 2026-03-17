import { Job } from 'bullmq';
import { prisma } from '@fresherflow/database';
import { logger } from '@fresherflow/logger';
import { SocialPlatform, SocialPostStatus } from '@prisma/client';
import axios from 'axios';
import { TwitterApi } from 'twitter-api-v2';

interface SocialJobData {
  socialPostId: string;
}

export async function processSocialJob(job: Job<SocialJobData>): Promise<void> {
  const { socialPostId } = job.data;

  const post = await prisma.socialPost.findUnique({
    where: { id: socialPostId },
    include: { opportunity: true },
  });

  if (!post) {
    logger.warn('[worker:social] Post record not found', { socialPostId });
    return;
  }

  // Skip if already published
  if (post.status === SocialPostStatus.PUBLISHED) {
    return;
  }

  // Handle DRY_RUN from env
  if (process.env.SOCIAL_DRY_RUN === 'true') {
     logger.info('[worker:social] dry run executed', { socialPostId: post.id });
     await prisma.socialPost.update({
       where: { id: post.id },
       data: { 
         status: SocialPostStatus.DRY_RUN,
         payload: { ...(typeof post.payload === 'object' && post.payload ? post.payload : {}), configState: 'dry_run_executed' } 
       },
     });
     return;
  }

  const payload = post.payload as { text?: string } | null;
  const text = payload?.text;
  if (!text) {
    throw new Error('Post payload text is missing');
  }

  try {
    let externalPostId: string | null = null;

    if (post.platform === SocialPlatform.X) {
      externalPostId = await postToX(text);
    } else if (post.platform === SocialPlatform.LINKEDIN) {
      externalPostId = await postToLinkedIn(text);
    } else if (post.platform === SocialPlatform.FACEBOOK) {
      externalPostId = await postToFacebook(text);
    }

    await prisma.socialPost.update({
      where: { id: post.id },
      data: {
        status: SocialPostStatus.PUBLISHED,
        externalPostId,
        publishedAt: new Date(),
        errorMessage: null,
      },
    });

    logger.info('[worker:social] posted successfully', { 
      platform: post.platform, 
      socialPostId, 
      externalPostId 
    });

  } catch (err: unknown) {
    let errorMessage = err instanceof Error ? err.message : String(err);
    
    // Capture axios response data if available (e.g. LinkedIn/Facebook specific errors)
    if (axios.isAxiosError(err) && err.response?.data) {
      const data = typeof err.response.data === 'string' 
        ? err.response.data 
        : JSON.stringify(err.response.data);
      errorMessage = `${errorMessage} - Response: ${data}`;
    }

    const newRetryCount = (post.retryCount || 0) + 1;
    const shouldDisable = newRetryCount >= 5;

    await prisma.socialPost.update({
      where: { id: post.id },
      data: { 
        status: shouldDisable ? SocialPostStatus.DISABLED : SocialPostStatus.FAILED, 
        errorMessage: errorMessage.slice(0, 1000), // Increased limit to capture more info
        retryCount: newRetryCount
      },
    });

    logger.error('[worker:social] post failed', { 
      platform: post.platform, 
      socialPostId, 
      retryCount: newRetryCount,
      disabled: shouldDisable,
      errorMessage 
    });

    if (shouldDisable) return; // Stop BullMQ from retrying further

    throw err; // Allow BullMQ to retry based on backoff
  }
}

async function postToX(text: string): Promise<string> {
  const client = new TwitterApi({
    appKey: process.env.X_API_KEY || '',
    appSecret: process.env.X_API_SECRET || '',
    accessToken: process.env.X_ACCESS_TOKEN || '',
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET || '',
  });

  const response = (await Promise.race([
    client.v2.tweet(text),
    new Promise((_, reject) => setTimeout(() => reject(new Error('X (Twitter) timeout after 15s')), 15000))
  ])) as { data: { id: string } };

  return response.data.id;
}

async function postToLinkedIn(text: string): Promise<string> {
  const org = process.env.LINKEDIN_ORGANIZATION_URN;
  const token = process.env.LINKEDIN_ACCESS_TOKEN;

  const res = await axios.post('https://api.linkedin.com/v2/ugcPosts', {
    author: org,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Restli-Protocol-Version': '2.0.0',
    },
    timeout: 15000,
  });

  return res.headers['x-restli-id'] || 'unknown';
}

async function postToFacebook(text: string): Promise<string> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  const res = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
    message: text,
    access_token: token,
  }, {
    timeout: 15000,
  });

  return res.data.id;
}
