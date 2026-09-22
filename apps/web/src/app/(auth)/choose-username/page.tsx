'use client';

import LoginForm from '../login/_components/LoginForm';
import { AuthGate } from '@/features/auth/components/ProfileGate';

export default function ChooseUsernamePage() {
    // Single shell — no separate UI. Username claim lives inside login's left/right two-pane (same as /login).
    return (
        <AuthGate>
            <LoginForm />
        </AuthGate>
    );
}
