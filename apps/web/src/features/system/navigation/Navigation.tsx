'use client';

import { DesktopNav } from './DesktopNav';
import { MobileTopNav } from './MobileTopNav';
import { MobileBottomTabs } from './MobileBottomTabs';
import { SocialSidebar } from './SocialSidebar';

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






