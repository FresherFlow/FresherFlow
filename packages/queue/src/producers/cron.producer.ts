import { cronQueue, CronJobData } from '../index';

export async function enqueueCronTask(data: CronJobData): Promise<void> {
    await cronQueue.add('run-cron', data);
}
