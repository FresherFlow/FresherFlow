/**
 * Master switch for public-profile surfaces (`/u/*`, `/recruiters`,
 * publish/share/view-page affordances).
 *
 * false = HIDDEN from the UI. No public-profile code is deleted — pages,
 * components, API calls and routes all stay in place and keep compiling.
 * Flip to true to re-show everything without touching any other file.
 */
export const PUBLIC_PROFILES_ENABLED = false;
