'use client';

import { DesktopNav } from './navbar/DesktopNav';
import { MobileTopNav } from './navbar/MobileTopNav';
import { MobileBottomTabs } from './navbar/MobileBottomTabs';
import { SocialSidebar } from './navbar/SocialSidebar';

export function Navbar() {
    return <DesktopNav />;
}

export function MobileNav() {
    return (
        <>
            <SocialSidebar />
            <MobileTopNav />
            <MobileBottomTabs />
        </>
    );
}
