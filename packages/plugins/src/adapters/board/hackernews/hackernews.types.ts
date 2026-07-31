/**
 * Shape of a single item returned by the Hacker News API.
 * For job stories, type is always "job".
 */
export interface HackerNewsItem {
  id: number;
  type?: string;
  by?: string;
  title?: string;
  text?: string;
  url?: string;
  time?: number;
  score?: number;
}
