import { Metadata } from 'next';
import { DiscoveryWorkspace } from '@/features/admin/discovery/DiscoveryWorkspace';

export const metadata: Metadata = {
    title: 'Discovery Control - Admin Portal',
    description: 'ATS Ingestion Engine & Opportunity Discovery Control Room',
    robots: {
        index: false,
        follow: false,
    },
};

export const dynamic = 'force-dynamic';

export default function AdminDiscoveryPage() {
    return <DiscoveryWorkspace />;
}
