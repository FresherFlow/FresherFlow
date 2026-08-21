import { ReactNode } from 'react';
import { NavigationWrapper } from '@/lib/components/NavigationWrapper';

export const dynamic = 'force-dynamic';

export default function AccountLayout({ children }: { children: ReactNode }) {
    return (
        <NavigationWrapper>
            <div className="w-full flex-1">{children}</div>
        </NavigationWrapper>
    );
}
