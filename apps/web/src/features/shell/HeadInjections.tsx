import { ADMIN_WEB_HOST } from '@/lib/utils/runtimeConfig';

/**
 * Returns the HTML string for head injection scripts.
 * Used as dangerouslySetInnerHTML in root layout <head> to avoid
 * useServerInsertedHTML which breaks during static export.
 */
export function getHeadInjectionScripts(): string {
    return `
        (function() {
            try {
                // Cookie first (written on every toggle), legacy localStorage
                // second — same priority as readSidebarOpen(). If these
                // disagree the rail mounts at one width while the header offset
                // var(--sidebar-w) uses the other and they overlap on load.
                var cookieMatch = document.cookie.match(/(?:^|;\\s*)sidebar_state=(true|false)/);
                var isCollapsed = cookieMatch
                    ? cookieMatch[1] !== 'true'
                    : localStorage.getItem('ff:sidebarCollapsed') === 'true';
                document.documentElement.setAttribute('data-sidebar', isCollapsed ? 'collapsed' : 'expanded');
                if (isCollapsed) {
                    document.documentElement.style.setProperty('--sidebar-w', '3rem');
                } else {
                    try {
                        var w = localStorage.getItem('ff:sidebarWidth');
                        var px = w ? parseInt(w, 10) : NaN;
                        if (px >= 192 && px <= 240) {
                            document.documentElement.style.setProperty('--sidebar-w', px + 'px');
                        } else {
                            document.documentElement.style.setProperty('--sidebar-w', '12rem');
                        }
                    } catch(e) {
                        document.documentElement.style.setProperty('--sidebar-w', '12rem');
                    }
                }
                
                var isLoggedIn = document.cookie.includes('ff_logged_in=true');
                document.documentElement.setAttribute('data-logged-in', isLoggedIn ? 'true' : 'false');
            } catch (e) {}
        })();

        (function () {
            var manifestLink = document.getElementById('ff-manifest-link');
            if (!manifestLink) return;
            var hostname = window.location.hostname.toLowerCase();
            if (hostname === '${ADMIN_WEB_HOST}'.toLowerCase()) {
                manifestLink.setAttribute('href', '/admin-manifest.json');
            }
        })();
    `;
}
