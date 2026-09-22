import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: { absolute: 'Admin | FresherFlow Admin' } };

export default function AdminIndex() {
    redirect('/admin/dashboard');
}






