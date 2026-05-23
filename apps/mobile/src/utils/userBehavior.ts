import { getJSON, setJSON, remove } from './storage';

const RECENT_SEARCHES_KEY = 'ff:recent_search_keywords';
const MAX_SEARCHES = 5;

/**
 * Saves a search keyword to the rolling history in MMKV.
 * Ensures the keyword is cleaned, duplicates are shifted to the front, and size is capped.
 */
export const saveRecentSearchKeyword = (keyword: string): void => {
  if (!keyword) return;
  const cleaned = keyword.trim().toLowerCase();
  if (cleaned.length < 3) return;

  try {
    const current = getJSON<string[]>(RECENT_SEARCHES_KEY) || [];
    
    // Shift duplicate keyword to the front if it already exists
    const filtered = current.filter(item => item !== cleaned);
    const updated = [cleaned, ...filtered].slice(0, MAX_SEARCHES);
    
    setJSON(RECENT_SEARCHES_KEY, updated);
  } catch (error) {
    console.warn('[userBehavior] Failed to save search keyword:', error);
  }
};

/**
 * Retrieves the rolling list of recent search keywords.
 */
export const getRecentSearchKeywords = (): string[] => {
  try {
    return getJSON<string[]>(RECENT_SEARCHES_KEY) || [];
  } catch (error) {
    console.warn('[userBehavior] Failed to get search keywords:', error);
    return [];
  }
};

/**
 * Clears the stored search history.
 */
export const clearSearchHistory = (): void => {
  try {
    remove(RECENT_SEARCHES_KEY);
  } catch (error) {
    console.warn('[userBehavior] Failed to clear search history:', error);
  }
};
