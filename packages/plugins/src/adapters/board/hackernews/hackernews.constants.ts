export const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';
export const HN_JOB_STORIES_URL = `${HN_API_BASE}/jobstories.json`;
export const HN_ITEM_URL = (id: number) => `${HN_API_BASE}/item/${id}.json`;
