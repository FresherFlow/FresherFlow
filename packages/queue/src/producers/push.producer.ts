import { pushQueue, PushJobData } from '../index';

export async function enqueuePushNotification(data: PushJobData): Promise<void> {
    await pushQueue.add('send-push', data);
}
