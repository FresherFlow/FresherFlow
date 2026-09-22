import type { Metadata } from 'next';
import LoginClient from './LoginClient';

export const metadata: Metadata = { title: { absolute: 'Login | FresherFlow Admin' } };

export default function Page() {
    return <LoginClient />;
}
