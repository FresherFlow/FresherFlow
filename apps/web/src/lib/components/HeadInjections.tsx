'use client';

import { useServerInsertedHTML } from 'next/navigation';
import { ADMIN_WEB_HOST } from '@/lib/utils/runtimeConfig';

/**
 * HeadInjections Component
 * 
 * Uses useServerInsertedHTML to inject blocking scripts into the <head> 
 * during SSR. This avoids the "script tag in React component" warnings 
 * in React 19/Next.js 15+ while ensuring scripts run before hydration.
 */
export function HeadInjections() {
    useServerInsertedHTML(() => (
        <>


            {/* Hydration State Script */}
            <script
                id="ff-hydration-state"
                dangerouslySetInnerHTML={{
                    __html: `
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
                    `,
                }}
            />

            {/* Manifest Switcher Script */}
            <script
                id="ff-manifest-switcher"
                dangerouslySetInnerHTML={{
                    __html: `
                        (function () {
                            var manifestLink = document.getElementById('ff-manifest-link');
                            if (!manifestLink) return;
                            var hostname = window.location.hostname.toLowerCase();
                            if (hostname === '${ADMIN_WEB_HOST}'.toLowerCase()) {
                                manifestLink.setAttribute('href', '/admin-manifest.json');
                            }
                        })();
                    `,
                }}
            />
        </>
    ));

    return null;
}
