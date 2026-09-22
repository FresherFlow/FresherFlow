import type { Metadata } from 'next';
import UsersClient from './UsersClient';

export const metadata: Metadata = { title: { absolute: 'Users | FresherFlow Admin' } };

export default function Page() {
    return <UsersClient />;
}
