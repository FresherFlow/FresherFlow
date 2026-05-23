import { mutateJSON, getJSON } from './storage';

const SEEN_KEY = 'ff:seen_job_ids';
const OPENED_KEY = 'ff:opened_job_ids';
const MAX_SEEN = 500; // rolling window, prune oldest

export async function markJobAsSeen(id: string): Promise<void> {
  try {
    mutateJSON<string[]>(SEEN_KEY, (seen) => {
      const list = seen || [];
      if (list.includes(id)) return list;
      return [...list, id].slice(-MAX_SEEN);
    });
  } catch (error) {
    console.error('[seenJobs] Failed to mark as seen:', error);
  }
}

export async function getSeenIds(): Promise<Set<string>> {
  try {
    const list = getJSON<string[]>(SEEN_KEY) || [];
    return new Set(list);
  } catch (error) {
    console.error('[seenJobs] Failed to get seen IDs:', error);
    return new Set();
  }
}

export async function isJobSeen(id: string): Promise<boolean> {
  const seen = await getSeenIds();
  return seen.has(id);
}

export async function markJobAsOpened(id: string): Promise<void> {
  try {
    mutateJSON<string[]>(OPENED_KEY, (opened) => {
      const list = opened || [];
      if (list.includes(id)) return list;
      return [...list, id].slice(-MAX_SEEN);
    });
  } catch (error) {
    console.error('[seenJobs] Failed to mark as opened:', error);
  }
}

export async function getOpenedIds(): Promise<Set<string>> {
  try {
    const list = getJSON<string[]>(OPENED_KEY) || [];
    return new Set(list);
  } catch (error) {
    console.error('[seenJobs] Failed to get opened IDs:', error);
    return new Set();
  }
}

export async function isJobOpened(id: string): Promise<boolean> {
  const opened = await getOpenedIds();
  return opened.has(id);
}

