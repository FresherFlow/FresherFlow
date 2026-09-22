import type { Metadata } from 'next';
import { DiscoveryWorkspace } from '@/features/admin/discovery/DiscoveryWorkspace';

export const metadata: Metadata = { title: { absolute: 'Discovery Engine | FresherFlow Admin' } };

export default function AdminDiscoveryPage() {
    return <DiscoveryWorkspace />;
}
