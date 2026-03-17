import { socialQueue, SocialJobData } from '../index';
import { logger } from '@fresherflow/logger';

export async function enqueueSocialPost(data: SocialJobData) {
    try {
        await socialQueue.add('process-social-post', data, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000, // 5s, 10s, 20s...
            },
            removeOnComplete: true,
            removeOnFail: false,
        });
    } catch (error) {
        logger.error('[queue:social] Failed to enqueue social post', {
            socialPostId: data.socialPostId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
