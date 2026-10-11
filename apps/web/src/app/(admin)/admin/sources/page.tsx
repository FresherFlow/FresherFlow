import type { Metadata } from 'next';
import { SourcesWorkspace } from '@/features/admin/sources/SourcesWorkspace';

export const metadata: Metadata = { title: { absolute: 'Source Health | FresherFlow Admin' } };

export default function AdminSourcesPage() {
    return <SourcesWorkspace />;
}
