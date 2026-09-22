import type { Metadata } from 'next';
import CreateClient from './CreateClient';

export const metadata: Metadata = { title: { absolute: 'Create Listing | FresherFlow Admin' } };

export default function Page() {
    return <CreateClient />;
}
