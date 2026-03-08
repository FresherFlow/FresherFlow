import { emailQueue, EmailJobData } from '../index';

export async function enqueueEmail(data: EmailJobData): Promise<void> {
    await emailQueue.add('send-email', data);
}
