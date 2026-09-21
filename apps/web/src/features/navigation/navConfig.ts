export * from '@/features/navigation/navRegistry';
export * from '@/features/navigation/navSpaces';
export * from '@/features/navigation/navMatchers';

// Deprecated shims for legacy 4-context model (MobileNavMenu)
export function getNavContext(pathname: string): string {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/account') || pathname.startsWith('/profile') || pathname.startsWith('/settings')) return 'account';
  if (pathname.startsWith('/govt')) return 'government';
  if (pathname.startsWith('/jobs') || pathname.startsWith('/companies') || pathname.startsWith('/resources')) return 'jobs';
  return 'default';
}
export function getNavItemsForContext(context: string) {
  const { DEFAULT_NAV_ITEMS, JOBS_NAV_ITEMS, GOVT_NAV_ITEMS, ACCOUNT_NAV_ITEMS } = require('./navRegistry');
  switch (context) {
    case 'jobs': return JOBS_NAV_ITEMS;
    case 'government': return GOVT_NAV_ITEMS;
    case 'account': return ACCOUNT_NAV_ITEMS;
    default: return DEFAULT_NAV_ITEMS;
  }
}
