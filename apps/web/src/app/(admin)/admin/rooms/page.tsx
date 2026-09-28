import type { Metadata } from 'next';
import RoomsClient from './RoomsClient';

export const metadata: Metadata = {
    title: { absolute: 'Rooms | FresherFlow Admin' },
    robots: { index: false, follow: false },
};

export default function Page() {
    return <RoomsClient />;
}
