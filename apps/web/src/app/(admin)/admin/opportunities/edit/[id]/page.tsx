import type { Metadata } from 'next';
import EditClient from './EditClient';

export const metadata: Metadata = { title: { absolute: 'Edit Listing | FresherFlow Admin' } };

export default function Page() {
    return <EditClient />;
}
