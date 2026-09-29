import { Suspense } from 'react';
import LoginForm from '../login/_components/LoginForm';
import { AuthGate } from '@/features/auth/components/ProfileGate';
import { RedirectHandoff } from './_components/redirect-handoff';

// Server component on purpose: route segment config (`dynamic`) is silently
// ignored in 'use client' pages, which is exactly how this route used to
// force a static prerender and crash the build on useSearchParams.
// Auth routes never prerender; LoginForm still gets its Suspense boundary.
export const dynamic = 'force-dynamic';

export default function ChooseUsernamePage() {
    // Single shell — no separate UI. Username claim lives inside login's left/right two-pane (same as /login).
    return (
        <AuthGate>
            <Suspense fallback={null}>
                <RedirectHandoff />
            </Suspense>
            <Suspense fallback={null}>
                <LoginForm />
            </Suspense>
        </AuthGate>
    );
}
