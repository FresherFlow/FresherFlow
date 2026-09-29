import { Suspense } from 'react';
import { AuthGate } from '@/features/auth/components/ProfileGate';
import LoadingScreen from '@/features/shell/LoadingScreen';
import { OnboardingContent } from './_components/onboarding-content';

// Server component on purpose: route segment config (`dynamic`) is silently
// ignored in 'use client' pages, which forced a static prerender that crashed
// the build on useSearchParams. Auth routes never prerender.
export const dynamic = 'force-dynamic';

export default function OnboardingPage() {
    return (
        <AuthGate>
            <Suspense fallback={<LoadingScreen />}>
                <OnboardingContent />
            </Suspense>
        </AuthGate>
    );
}
