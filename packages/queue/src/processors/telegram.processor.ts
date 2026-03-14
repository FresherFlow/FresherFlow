import { Job } from 'bullmq';
import { logger } from '@fresherflow/logger';
import axios from 'axios';

interface TelegramJobData {
    botToken: string;
    channelId: string;
    message: string;
    opportunityId: string;
    dedupeKey: string;
    publicChannel: string;
}

export async function processTelegramJob(job: Job<TelegramJobData>): Promise<void> {
    const { botToken, channelId, message, opportunityId } = job.data;

    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
                chat_id: channelId,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: false,
            }
        );
        const messageId = response?.data?.result?.message_id;
        logger.info('Telegram broadcast sent', { opportunityId, messageId });
    } catch (error: unknown) {
        const err = error as { response?: { status?: number; data?: { description?: string } } };
        const status = err?.response?.status;
        const description = err?.response?.data?.description;
        logger.error('Telegram broadcast failed', { opportunityId, status, description });
        throw error; // BullMQ will retry
    }
}
