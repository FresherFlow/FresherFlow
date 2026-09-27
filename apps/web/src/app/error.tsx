'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ErrorState } from '@/features/shell/ErrorState';
import { Button } from '@/ui/Button';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
    useEffect(() => {
        console.error('Global error boundary:', error);
    }, [error]);

    return (
        <ErrorState
            code="500"
            title="Oops! Something went wrong."
            message="We hit an unexpected error. Please try again — your data is safe."
        >
            <Button variant="outline" onClick={() => reset()}>
                Try again
            </Button>
            <Button asChild>
                <Link href="/">Back to home</Link>
            </Button>
        </ErrorState>
    );
}
