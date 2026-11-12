import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import BreakUiClient from './BreakUiClient';

/**
 * Dev-only stress-test surface for the job card (`break-ui` skill).
 * Returns 404 in production builds; it is not part of the product.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
    robots: { index: false, follow: false },
};

export default function BreakUiJobCardPage() {
    if (process.env.NODE_ENV === 'production') notFound();

    return (
        <Suspense fallback={null}>
            <BreakUiClient />
        </Suspense>
    );
}
