import { cronQueue, CronJobData } from '../index';

export async function enqueueCronTask(data: CronJobData): Promise<void> {
    // The `internal` queue worker dispatches on the job name `cron-task`
    // (see WORKER_DEFINITIONS in ../index.ts). The previous name, `run-cron`,
    // matched no branch and fell through to "Unknown job name", so every
    // cron task failed on the worker instead of running.
    await cronQueue.add('cron-task', data);
}
