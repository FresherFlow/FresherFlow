import { Opportunity } from '@fresherflow/types';
import { mutateJSON, getJSON, remove, setString, getString } from './storage';

export type AlertOpportunity = Opportunity & {
  matchScore?: number;
  matchReason?: string;
};

const DRIP_QUEUE_KEY = 'ff:drip_opportunities_queue';
const LAST_DRIP_TIME_KEY = 'ff:last_drip_timestamp';

// 30-minute default drip interval in production, but 1-minute in dev for high-fidelity demonstration
const DRIP_INTERVAL_MS = __DEV__ ? 60000 : 1800000;

export async function getDripQueue(): Promise<AlertOpportunity[]> {
  try {
    return getJSON<AlertOpportunity[]>(DRIP_QUEUE_KEY) || [];
  } catch (error) {
    console.error('[dripQueue] Failed to get drip queue:', error);
    return [];
  }
}

export async function enqueueDripJobs(opportunities: AlertOpportunity[]): Promise<void> {
  try {
    mutateJSON<AlertOpportunity[]>(DRIP_QUEUE_KEY, (existing) => {
      const list = existing || [];
      const existingIds = new Set(list.map(o => o.id));
      const filteredNew = opportunities.filter(o => !existingIds.has(o.id));
      if (filteredNew.length === 0) return list;
      return [...list, ...filteredNew];
    });
  } catch (error) {
    console.error('[dripQueue] Failed to enqueue drip jobs:', error);
  }
}

export async function dequeueDripJob(): Promise<AlertOpportunity | null> {
  try {
    let nextJob: AlertOpportunity | null = null;
    mutateJSON<AlertOpportunity[]>(DRIP_QUEUE_KEY, (queue) => {
      const list = queue || [];
      if (list.length === 0) return list;
      nextJob = list[0];
      return list.slice(1);
    });
    return nextJob;
  } catch (error) {
    console.error('[dripQueue] Failed to dequeue drip job:', error);
    return null;
  }
}

export async function clearDripQueue(): Promise<void> {
  try {
    remove(DRIP_QUEUE_KEY);
    remove(LAST_DRIP_TIME_KEY);
  } catch (error) {
    console.error('[dripQueue] Failed to clear drip queue:', error);
  }
}

export async function shouldTriggerDrip(): Promise<boolean> {
  try {
    const lastDripStr = getString(LAST_DRIP_TIME_KEY);
    if (!lastDripStr) return true;
    
    const lastDrip = parseInt(lastDripStr, 10);
    return Date.now() - lastDrip >= DRIP_INTERVAL_MS;
  } catch {
    return true;
  }
}

export async function recordDripTrigger(): Promise<void> {
  try {
    setString(LAST_DRIP_TIME_KEY, Date.now().toString());
  } catch (error) {
    console.error('[dripQueue] Failed to record drip trigger:', error);
  }
}
