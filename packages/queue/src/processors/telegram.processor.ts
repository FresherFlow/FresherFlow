import { Job } from 'bullmq';
import { logger } from '@fresherflow/logger';
import axios from 'axios';
import { prisma } from '@fresherflow/database';

interface TelegramJobData {
    botToken: string;
    channelId: string;
    message: string;
    opportunityId: string;
    dedupeKey: string;
    publicChannel: string;
}

export async function processTelegramJob(job: Job<TelegramJobData>): Promise<void> {
    const { botToken, channelId, message, opportunityId, dedupeKey, publicChannel } = job.data;

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
        await prisma.telegramBroadcast.upsert({
            where: { dedupeKey },
            create: {
                opportunityId,
                channel: publicChannel,
                dedupeKey,
                status: 'SENT',
                messageId: messageId ? String(messageId) : null,
                sentAt: new Date(),
            },
            update: {
                channel: publicChannel,
                status: 'SENT',
                messageId: messageId ? String(messageId) : null,
                errorMessage: null,
                sentAt: new Date(),
            }
        });
        logger.info('Telegram broadcast sent', { opportunityId, messageId });
    } catch (error: unknown) {
        const err = error as { response?: { status?: number; data?: { description?: string } } };
        const status = err?.response?.status;
        const description = err?.response?.data?.description;
        await prisma.telegramBroadcast.upsert({
            where: { dedupeKey },
            create: {
                opportunityId,
                channel: publicChannel,
                dedupeKey,
                status: 'FAILED',
                errorMessage: description || (error instanceof Error ? error.message : String(error)),
            },
            update: {
                channel: publicChannel,
                status: 'FAILED',
                errorMessage: description || (error instanceof Error ? error.message : String(error)),
                sentAt: null,
            }
        });
        logger.error('Telegram broadcast failed', { opportunityId, status, description });
        throw error; // BullMQ will retry
    }
}
