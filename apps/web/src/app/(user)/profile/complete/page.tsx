'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGate } from '@/features/auth/components/ProfileGate';

function Redirect() {
    const router = useRouter();
    useEffect(() => { router.replace('/onboarding'); }, [router]);
    return null;
}

export default function ProfileCompletePage() {
    return (
        <AuthGate>
            <Redirect />
        </AuthGate>
    );
}
