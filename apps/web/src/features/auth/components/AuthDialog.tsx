'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/ui/Button';

interface AuthDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Lightweight sign-in prompt shown from TopNav when a logged-out visitor
 * taps an authenticated action. The actual auth (email OTP / Google) lives
 * in the single login shell at /login.
 */
export default function AuthDialog({ isOpen, onClose }: AuthDialogProps) {
    const router = useRouter();
    const pathname = usePathname();

    if (!isOpen) return null;

    const goToLogin = () => {
        const target = pathname && pathname !== '/'
            ? `/login?redirect=${encodeURIComponent(pathname)}`
            : '/login';
        onClose();
        router.push(target);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative selection:bg-primary/20">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-full"
                    aria-label="Close"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 text-primary-foreground shadow-lg shadow-primary/20">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM9 5a1 1 0 011-1h4a1 1 0 011 1v2H9V5zm7 14H4V9h16v10z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-foreground tracking-tight">
                            Sign in to continue
                        </h2>
                        <p className="text-sm text-muted-foreground mt-2">
                            Use your email or Google account — no password needed.
                        </p>
                    </div>

                    <Button type="button" onClick={goToLogin} size="sm" className="w-full">
                        Continue to sign in →
                    </Button>
                </div>
            </div>
        </div>
    );
}
