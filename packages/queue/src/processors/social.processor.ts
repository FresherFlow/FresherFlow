import { Job } from 'bullmq';
import { prisma } from '@fresherflow/database';
import { logger } from '@fresherflow/logger';
import { SocialPlatform, SocialPostStatus } from '@prisma/client';
import axios from 'axios';

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
       where: { id: post.id as string },
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
    const title = post.opportunity ? `${post.opportunity.company} - ${post.opportunity.title}` : 'New Opportunity';

    if (post.platform === SocialPlatform.X) {
      externalPostId = await postToX(title, text);
    } else if (post.platform === SocialPlatform.LINKEDIN) {
      externalPostId = await postToLinkedIn(title, text);
    } else if (post.platform === SocialPlatform.FACEBOOK) {
      externalPostId = await postToFacebook(text);
    }

    await prisma.socialPost.update({
      where: { id: post.id as string },
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

    const currentRetryCount = post.retryCount as number;
    const newRetryCount = (currentRetryCount || 0) + 1;
    const shouldDisable = newRetryCount >= 5;

    await prisma.socialPost.update({
      where: { id: post.id as string },
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

async function postToBuffer(channelId: string | undefined, text: string): Promise<string> {
  const apiKey = process.env.BUFFER_API_KEY;
  if (!apiKey) {
    throw new Error('Buffer API key is not configured. Set BUFFER_API_KEY in environment.');
  }
  if (!channelId) {
    throw new Error('Buffer Channel ID is not configured.');
  }

  const response = await axios.post('https://api.buffer.com', {
    query: `
      mutation CreatePost($input: CreatePostInput!) {
        createPost(input: $input) {
          ... on PostActionSuccess {
            post {
              id
            }
          }
          ... on MutationError {
            message
          }
        }
      }
    `,
    variables: {
      input: {
        channelId,
        text,
        schedulingType: 'automatic',
        mode: 'shareNow',
      },
    },
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    timeout: 15000,
  });

  if (response.data?.errors) {
    throw new Error(`Buffer GraphQL Error (CreatePost): ${JSON.stringify(response.data.errors)}`);
  }

  const result = response.data?.data?.createPost;
  if (result?.message) {
    throw new Error(`Buffer CreatePost Error: ${result.message}`);
  }

  const postId = result?.post?.id;
  if (!postId) {
    throw new Error(`Failed to create Buffer Post: ${JSON.stringify(response.data)}`);
  }

  return postId;
}

async function postToX(title: string, text: string): Promise<string> {
  return postToBuffer(process.env.BUFFER_X_CHANNEL_ID, text);
}

async function postToLinkedIn(title: string, text: string): Promise<string> {
  return postToBuffer(process.env.BUFFER_LINKEDIN_CHANNEL_ID, text);
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
