import type { Metadata } from 'next';
import CaptionsClient from './CaptionsClient';

export const metadata: Metadata = { title: { absolute: 'Captions | FresherFlow Admin' } };

export default function Page() {
    return <CaptionsClient />;
}
