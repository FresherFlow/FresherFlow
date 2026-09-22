import type { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = { title: { absolute: 'Dashboard | FresherFlow Admin' } };

export default function Page() {
    return <DashboardClient />;
}
