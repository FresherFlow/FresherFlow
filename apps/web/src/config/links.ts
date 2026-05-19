/**
 * Centralized external and internal redirect links for FresherFlow.
 * Update these links here to instantly sync them across all buttons, nav links, and pages.
 */
export const APP_LINKS = {
    // Direct link to the absolute latest APK attached to GitHub releases
    // Note: 'releases/latest/download/FresherFlow.apk' will automatically redirect to the asset 
    // attached to your most recent published release on GitHub.
    androidDownload: "https://github.com/MukeshCheekatla/FresherFlow/releases/latest/download/FresherFlow.apk",
    currentVersion: "v1.0.0", // Update this string here when releasing a new version!
    
    // Fallback release page overview
    githubReleases: "https://github.com/MukeshCheekatla/FresherFlow/releases/latest",
    
    // Future target links (keep empty or comment out until live)
    playStore: "",
    appStore: "",
    
    // Official Community Links
    discord: "https://discord.gg/CcPAnWSHD",
    telegram: "https://t.me/fresherflowin",
    whatsapp: "https://whatsapp.com/channel/0029VbCkZu6FHWq0qJOOU73D",
    linkedin: "https://www.linkedin.com/company/fresherflow-in",
    x: "https://x.com/Fresherflow",
    instagram: "https://instagram.com/fresherflow",
    facebook: "https://www.facebook.com/FresherFlow.in"
} as const;
