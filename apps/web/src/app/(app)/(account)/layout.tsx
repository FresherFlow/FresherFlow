import { ReactNode } from 'react';
import { AccountShell } from './AccountShell';

export default function AccountLayout({ children }: { children: ReactNode }) {
    return <AccountShell>{children}</AccountShell>;
}
