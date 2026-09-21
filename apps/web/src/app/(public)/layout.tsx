'use client';

import { NavigationWrapper } from '@/features/navigation/NavigationWrapper';
import { SiteFooter } from '@/features/shell/SiteFooter';
import { usePathname } from 'next/navigation';

/**
 * Normal site pages that get the site footer. App-level feed surfaces
 * (jobs, companies, govt, discussions, …) are excluded — the footer must
 * NOT appear under infinite feeds / app screens. The home page renders its
 * own closing stack already, so it is excluded here to avoid a duplicate.
 */
const FOOTER_PATHS = ['/', '/about', '/blog', '/careers', '/contact', '/privacy', '/terms'];

function SiteFooterGate() {
    const pathname = usePathname() || '/';
    const normalized = pathname.replace(/\/+$/, '') || '/';
    if (!FOOTER_PATHS.includes(normalized)) return null;
    return <SiteFooter />;
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <NavigationWrapper>
            {children}
            <SiteFooterGate />
        </NavigationWrapper>
    );
}
