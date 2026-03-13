'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

export default function LogoutClient() {
    const { logout } = useAuth();

    useEffect(() => {
        if (logout) {
            logout();
        }
    }, [logout]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
            <div className="premium-card max-w-md w-full p-8 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <ArrowRightOnRectangleIcon className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">Logging Out</h1>
                    <p className="text-sm text-muted-foreground">
                        Securing your session and clearing credentials...
                    </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                </div>
            </div>
        </div>
    );
}
