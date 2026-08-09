import { Metadata } from 'next';
import { DiscoveryWorkspace } from '@/features/admin/discovery/DiscoveryWorkspace';



export const dynamic = 'force-dynamic';

export default function AdminDiscoveryPage() {
    return <DiscoveryWorkspace />;
}
