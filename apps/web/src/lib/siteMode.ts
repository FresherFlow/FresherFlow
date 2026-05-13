export type SiteMode = "private" | "govt";
export const SITE_MODE_COOKIE = "ff_site_mode";

export function isGovernmentModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_GOVT_MODE === "true";
}

export function getSiteModeClient(): SiteMode {
  if (typeof document === "undefined") return "private";
  if (!isGovernmentModeEnabled()) return "private";
  const match = document.cookie.match(new RegExp('(^| )' + SITE_MODE_COOKIE + '=([^;]+)'));
  if (match && match[2] === "govt") return "govt";
  return "private";
}

export function setSiteModeClient(mode: SiteMode) {
  if (typeof document !== "undefined") {
    if (!isGovernmentModeEnabled() && mode === "govt") return;
    // Set cookie, max-age 1 year
    document.cookie = `${SITE_MODE_COOKIE}=${mode}; path=/; max-age=31536000; SameSite=Lax`;
    // Mirror in localStorage
    localStorage.setItem(SITE_MODE_COOKIE, mode);
  }
}
