export const USER_PATHS = [
    "/dashboard",
    "/account",
    "/profile",
    "/alerts",
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

export function isOpportunityPublic(pathname: string) {
    if (pathname === '/opportunities/create') return false;
    if (pathname.startsWith('/opportunities/edit/')) return false;
    return pathname.startsWith('/opportunities/');
}

export function isPublicPath(pathname: string) {
    if (pathname === "/") return true;
    if (pathname === "/privacy") return true;
    if (pathname === "/terms") return true;
    if (pathname === "/join") return true;
    if (pathname.startsWith("/r/")) return true;
    if (pathname.startsWith("/jobs")) return true;
    if (pathname.startsWith("/internships")) return true;
    if (pathname.startsWith("/walk-ins")) return true;
    if (pathname.startsWith("/walkins")) return true;
    if (isOpportunityPublic(pathname)) return true;
    if (pathname.startsWith("/companies")) return true;
    
    return false;
}

export function isPublicDetailPath(pathname: string): boolean {
    if (pathname.startsWith('/walk-ins/details/') || pathname.startsWith('/walkins/details/')) return true;
    if (pathname.startsWith('/jobs/')) return pathname !== '/jobs/new';
    if (pathname.startsWith('/internships/')) return true;
    if (isOpportunityPublic(pathname)) return true;
    return false;
}
