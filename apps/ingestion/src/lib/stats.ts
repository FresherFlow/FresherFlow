const START_TIME = Date.now();

export const IngestionStats = {
  totalRuns: 0,
  totalJobsIngested: 0,
  totalJobsSaved: 0,
  totalJobsSkipped: 0,
  totalErrors: 0,
  lastRunTimestamp: new Date().toISOString()
};

export function getStats() {
  return {
    uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
    totalRuns: IngestionStats.totalRuns,
    totalJobsIngested: IngestionStats.totalJobsIngested,
    totalJobsSaved: IngestionStats.totalJobsSaved,
    totalJobsSkipped: IngestionStats.totalJobsSkipped,
    totalErrors: IngestionStats.totalErrors,
    lastRunTimestamp: IngestionStats.lastRunTimestamp
  };
}

export function recordRun(total: number, saved: number, skipped: number, hasError: boolean) {
  IngestionStats.totalRuns += 1;
  IngestionStats.totalJobsIngested += total;
  IngestionStats.totalJobsSaved += saved;
  IngestionStats.totalJobsSkipped += skipped;
  if (hasError) IngestionStats.totalErrors += 1;
  IngestionStats.lastRunTimestamp = new Date().toISOString();
}
