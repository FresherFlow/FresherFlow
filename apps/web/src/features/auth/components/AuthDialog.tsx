'use client';

import { useState, useContext } from 'react';
import { AuthContext } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';

interface AuthDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AuthDialog({ isOpen, onClose }: AuthDialogProps) {
    // Use AuthContext directly to work on both admin and user pages
    const authContext = useContext(AuthContext);
    const login = authContext?.login || (async () => { });

    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // Only support login mode now
    const mode = 'login';
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            setLoading(true);
            if (mode === 'login') {
                await login(email, password);
            }
            router.push('/dashboard');
            onClose();
        } catch (err: unknown) {
            setError((err as Error).message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative selection:bg-primary/20">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-full"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="p-8">
                    <div className="text-center mb-10">
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 text-primary-foreground shadow-lg shadow-primary/20">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM9 5a1 1 0 011-1h4a1 1 0 011 1v2H9V5zm7 14H4V9h16v10z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-foreground tracking-tight capitalize">
                            Welcome to Flow
                        </h2>
                        <p className="text-[10px] text-muted-foreground capitalize font-bold tracking-[0.15em] mt-1 opacity-60">
                            {mode === 'login' ? 'Execute Session Authentication' : 'Initialize Performance Profile'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">


                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground capitalize tracking-widest ml-1">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="IDENTITY@DOMAIN.COM"
                                className="premium-input !h-12"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground capitalize tracking-widest ml-1">
                                Access Password
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="premium-input !h-12"
                            />
                        </div>

                        {error && (
                            <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg text-[11px] font-bold capitalize tracking-tight italic">
                                ❌ {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full premium-button !h-12 text-sm capitalize font-bold tracking-widest transition-all shadow-lg shadow-primary/20"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                    <span>Processing...</span>
                                </div>
                            ) : (
                                'Authenticate'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
