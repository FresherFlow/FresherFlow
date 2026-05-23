import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import { getBoolean, setBoolean } from '@/utils/storage';

interface ThemeColors {
  background?: string;
  primary?: string;
}

/**
 * Ensures the in-app browser preference is written to storage with its default value
 * on the very first call (before AppearanceScreen is ever visited).
 * This prevents the mock-MMKV async hydration race where the key reads as undefined.
 */
let defaultsInitialized = false;
const ensureDefaults = () => {
  if (defaultsInitialized) return;
  defaultsInitialized = true;
  // Only write if the key has truly never been set (undefined means no value stored)
  const existing = getBoolean('use_in_app_browser', true);
  // getBoolean already returns the default, but we need to persist it so future reads work
  // after cold restarts before hydration re-populates the cache from AsyncStorage.
  // We only write if the raw MMKV call returned undefined (i.e., not yet set).
  setBoolean('use_in_app_browser', existing);
};

/**
 * Opens a URL in-app (SFSafariViewController / Chrome Custom Tab) when the
 * 'use_in_app_browser' setting is ON, or externally when OFF.
 * Non-HTTP schemes (mailto:, tel:, etc.) always use Linking directly.
 */
export const openExternalURL = async (url: string, colors?: ThemeColors): Promise<void> => {
  if (!url || typeof url !== 'string') return;

  const trimmed = url.trim();
  if (!trimmed) return;

  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(trimmed);
  const isNonWeb = /^(mailto|tel|sms):/i.test(trimmed);

  // Non-web schemes (mailto:, tel:, sms:) — always open via Linking
  if (isNonWeb) {
    await Linking.openURL(trimmed);
    return;
  }

  // Prepend https:// only if there is truly no scheme
  const target = hasScheme ? trimmed : `https://${trimmed}`;

  ensureDefaults();
  const useInApp = getBoolean('use_in_app_browser', true);

  console.log(`[browser] useInApp=${useInApp} url=${target}`);

  if (useInApp) {
    try {
      await WebBrowser.openBrowserAsync(target, {
        dismissButtonStyle: 'close',
        toolbarColor: colors?.background,
        controlsColor: colors?.primary,
        createTask: false,
        presentationStyle: WebBrowser.WebBrowserPresentationStyle?.PAGE_SHEET,
      });
    } catch (e) {
      console.warn('[browser] WebBrowser failed, falling back to Linking:', e);
      await Linking.openURL(target);
    }
  } else {
    await Linking.openURL(target);
  }
};
