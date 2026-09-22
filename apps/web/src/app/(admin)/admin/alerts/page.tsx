import type { Metadata } from 'next';
import AlertsClient from './AlertsClient';

export const metadata: Metadata = { title: { absolute: 'Alerts Health | FresherFlow Admin' } };

export default function Page() {
    return <AlertsClient />;
}
