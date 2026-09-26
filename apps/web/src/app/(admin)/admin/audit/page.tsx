import type { Metadata } from 'next';
import AuditLogClient from './AuditLogClient';

export const metadata: Metadata = {
    title: { absolute: 'Audit log | FresherFlow Admin' },
    robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function Page() {
    return <AuditLogClient />;
}
