import type { Metadata } from 'next';
import AnalyticsClient from './AnalyticsClient';

export const metadata: Metadata = { title: { absolute: 'Analytics | FresherFlow Admin' } };

export default function Page() {
    return <AnalyticsClient />;
}
