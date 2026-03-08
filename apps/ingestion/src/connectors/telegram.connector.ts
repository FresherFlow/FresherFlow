import axios from 'axios';
import { logger } from '@fresherflow/logger';

export class TelegramConnector {
    /**
     * Reads recent messages from standard telegram channel feeds using Bot APIs.
     * Helpful for copying external channel lists if needed.
     */
    async fetchChannelMessages(channelId: string, botToken: string, limit = 50) {
        try {
            const endpoint = `https://api.telegram.org/bot${botToken}/getUpdates`;
            // More realistically this would pull specific history or webhooks 
            const response = await axios.get(endpoint, { params: { limit } });
            const messages = response.data?.result || [];

            logger.info(`Fetched ${messages.length} messages from Telegram ${channelId}`);
            return messages;
        } catch (error) {
            logger.error(`Failed to fetch Telegram jobs for ${channelId}:`, error);
            throw error;
        }
    }
}
