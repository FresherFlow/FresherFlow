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
const FOOTER_PATHS = ['/', '/about', '/blog', '/careers', '/contact', '/privacy', '/terms', '/faq'];

function SiteFooterGate() {
    const pathname = usePathname() || '/';
    const normalized = pathname.replace(/\/+$/, '') || '/';
    if (!FOOTER_PATHS.includes(normalized)) return null;
    return <SiteFooter />;
}

/**
 * /u/<handle> is a self-contained personal page — the design's own nav and footer
 * live in the profile component. The site shell's header/mobile nav would sit on
 * top of it as a second, unrelated navbar, so profile routes skip the shell.
 * Every other public route keeps the normal navigation wrapper and footer gate.
 */
function ProfileShellGate({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || '/';
    const isProfilePage = pathname.replace(/\/+$/, '').startsWith('/u/');
    if (isProfilePage) return <>{children}</>;
    return (
        <NavigationWrapper>
            {children}
            <SiteFooterGate />
        </NavigationWrapper>
    );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <ProfileShellGate>
            {children}
        </ProfileShellGate>
    );
}
