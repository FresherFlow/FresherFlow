import type { Metadata } from 'next';
import { AboutClient } from './AboutClient';

export const metadata: Metadata = {
    title: 'About FresherFlow',
    description: 'Learn why we built FresherFlow, our verification guidelines, and how we deliver ad-free fresher career opportunities.',
    alternates: {
        canonical: '/about',
    },
};

export default function AboutPage() {
    return (
        <main className="max-w-4xl mx-auto px-4 md:px-8 py-6">
            <AboutClient />
        </main>
    );
}
