import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Dev-only preview routes (/dev/*) must never be reachable in production.
 */
export default function DevLayout({ children }: { children: React.ReactNode }) {
    if (process.env.NODE_ENV === 'production') {
        notFound();
    }
    return <>{children}</>;
}
