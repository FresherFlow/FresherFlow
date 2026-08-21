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
                var isCollapsed = localStorage.getItem('ff:sidebarCollapsed') === 'true';
                document.documentElement.setAttribute('data-sidebar', isCollapsed ? 'collapsed' : 'expanded');
                document.documentElement.style.setProperty('--sidebar-w', isCollapsed ? '3rem' : '12rem');
                
                var isLoggedIn = document.cookie.includes('ff_logged_in=true');
                document.documentElement.setAttribute('data-logged-in', isLoggedIn ? 'true' : 'false');

                var showDetail = localStorage.getItem('ff:showDetail');
                document.documentElement.setAttribute('data-show-detail', showDetail === 'false' ? 'false' : 'true');
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
