import { telegramQueue, TelegramJobData } from '../index';

export async function enqueueTelegramBroadcast(data: TelegramJobData): Promise<void> {
    await telegramQueue.add('send-telegram', data);
}
