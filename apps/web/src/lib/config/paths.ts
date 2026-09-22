export const USER_PATHS = [
    "/dashboard",
    "/account",
    "/settings",
    "/profile",
    "/alerts",
    "/tracker",
    "/saved",
];

export const ADMIN_ROOT_PREFIXES = [
    '/dashboard',
    '/opportunities',
    '/jobs',
    '/walkins',
    '/ingestion',
    '/analytics',
    '/feedback',
    '/alerts',
    '/telegram',
    '/settings',
];

export function isAdminPath(pathname: string) {
    return ADMIN_ROOT_PREFIXES.some(
        p => pathname === p || pathname.startsWith(`${p}/`)
    );
}

export function isUserPath(pathname: string) {
    return USER_PATHS.some(
        p => pathname === p || pathname.startsWith(`${p}/`)
    );
}

export function isAuthPath(pathname: string) {
    if (pathname === '/login') return true;
    if (pathname === '/signup') return true;
    if (pathname === '/register') return true;
    if (pathname === '/choose-username') return true;
    if (pathname.startsWith('/auth/')) return true;
    return false;
}

/**
 * Auth *entry* pages — the places a signed-in visitor should be sent straight into the app.
 *
 * Onboarding steps such as /choose-username are deliberately excluded. A signed-in user
 * who has not claimed a username yet is *supposed* to be there, so bouncing them off it
 * makes /dashboard and /choose-username redirect to each other forever.
 */
export const AUTH_ENTRY_PATHS = ['/login', '/signup', '/register'];

export function isAuthEntryPath(pathname: string) {
    return AUTH_ENTRY_PATHS.includes(pathname);
}

/**
 * Only same-origin, non-auth destinations are allowed through a `redirect` param.
 * Single home for the rule — used by the proxy and by client auth screens.
 */
export function isSafeInternalRedirect(path: string | null | undefined) {
    if (!path) return false;
    const clean = path.trim();
    if (!clean.startsWith('/') || clean.startsWith('//')) return false;
    if (clean === '/login' || clean.startsWith('/login?') || clean === '/logout' || clean.startsWith('/logout?')) return false;
    return true;
}

export function isOpportunityPublic(pathname: string) {
    if (pathname === '/jobs/create') return false;
    if (pathname.startsWith('/jobs/edit/')) return false;
    return pathname.startsWith('/jobs/');
}

export function isPublicPath(pathname: string) {
    // Exact paths
    const exactPaths = [
        '/', '/about', '/privacy', '/terms', '/careers', 
        '/contact', '/resources', '/blog', '/govt', 
        '/batch', '/roles', '/skills', '/locations', 
        '/app', '/join', '/pricing'
    ];
    if (exactPaths.includes(pathname)) return true;

    // Prefixes
    if (pathname.startsWith("/u/")) return true;
    if (pathname.startsWith("/r/")) return true;
    if (pathname.startsWith("/jobs")) return true;
    if (pathname.startsWith("/companies")) return true;
    if (pathname.startsWith("/walkins")) return true;
    if (pathname.startsWith("/walk-ins")) return true;
    if (pathname.startsWith("/internships")) return true;
    if (pathname.startsWith("/remote")) return true;
    if (pathname.startsWith("/off-campus")) return true;
    if (pathname.startsWith("/hackathons")) return true;
    if (pathname.startsWith('/locations/')) return true;
    if (pathname.startsWith('/skills/')) return true;
    if (pathname.startsWith('/batch/')) return true;
    if (pathname.startsWith('/roles/')) return true;
    // Legacy taxonomy namespaces 301 to /jobs/* (doc 22 v2) but stay public.
    if (pathname.startsWith('/govt/')) return true;
    if (pathname.startsWith('/resources/')) return true;
    if (pathname.startsWith('/blog/')) return true;
    if (pathname.startsWith('/companies/')) return true;
    
    return false;
}

export function isPublicDetailPath(pathname: string): boolean {
    if (pathname.startsWith('/jobs/')) return pathname !== '/jobs/new';
    if (pathname.startsWith('/govt/')) return true;
    return false;
}
