'use client';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { ReactNode } from "react";

export function ConditionalAuthProvider({ children }: { children: ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
}


