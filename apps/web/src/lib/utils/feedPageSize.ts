/**
 * Number of jobs server-rendered into list-page HTML and shown before
 * client-side "load more" widens the window. Single source of truth:
 * route components, board pages, and hydration logic must all import this.
 * If it ever changes, `useOpportunitiesFeed` hydration (opportunities.length
 * < total · fetch the rest) keeps working because both sides read this value.
 */
export const FEED_PAGE_SIZE = 20;
