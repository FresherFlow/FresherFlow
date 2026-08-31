'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileApi } from '@/lib/api/profile';
import { usernameApi } from '@fresherflow/api-client';
import { CDN_URL } from '@/lib/utils/runtimeConfig';
import { signProtectedCdnUrl } from '@/lib/api/cdnFeed';
import { AuthGate } from '@/lib/components/ProfileGate';
import toast from 'react-hot-toast';

// Simple debounce helper
function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    return useCallback((...args: Parameters<T>) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);
}

export default function ChooseUsernamePage() {
    return (
        <AuthGate>
            <ChooseUsernameForm />
        </AuthGate>
    );
}

function ChooseUsernameForm() {
    const { user, skipUsername, refreshUser } = useAuth();
    const router = useRouter();

    const [username, setUsername] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isClaiming, setIsClaiming] = useState(false);
    const [isSkipping, setIsSkipping] = useState(false);
    const [takenUsernames, setTakenUsernames] = useState<string[] | null>(null);

    // Redirect if they already have a username
    useEffect(() => {
        if (user?.username) {
            router.push('/dashboard');
        }
    }, [user, router]);

    // Fetch taken usernames from CDN on mount
    useEffect(() => {
        async function fetchTakenUsernames() {
            try {
                const rawUrl = `${CDN_URL}/meta/taken-usernames.min.json`;
                const signedUrl = await signProtectedCdnUrl(rawUrl);
                const res = await fetch(signedUrl);
                if (res.ok) {
                    const data = await res.json();
                    const list = Array.isArray(data) ? data : (Array.isArray(data?.usernames) ? data.usernames : null);
                    if (list) {
                        setTakenUsernames(list.map((u: string) => String(u).toLowerCase()));
                    }
                }
            } catch {
                // Silently ignore pre-fetch errors
            }
        }
        void fetchTakenUsernames();
    }, []);

    // Check availability
    const checkAvailability = useCallback(
        async (val: string) => {
            if (val.length < 3) {
                setIsAvailable(null);
                setIsChecking(false);
                return;
            }

            // 1. Try local check first
            if (takenUsernames !== null) {
                const isTaken = takenUsernames.includes(val);
                setIsAvailable(!isTaken);
                if (isTaken) {
                    setError('Username already taken');
                } else {
                    setError(null);
                }
                setIsChecking(false);
                return;
            }

            // 2. Fallback to API check
            try {
                const res = await usernameApi.check(val);
                if (res.reason === 'Authentication required' || res.reason?.includes('Authentication')) {
                    setIsAvailable(true);
                    setError(null);
                } else {
                    setIsAvailable(res.available);
                    if (!res.available) {
                        setError(res.reason || 'Username already taken');
                    } else {
                        setError(null);
                    }
                }
            } catch {
                // Graceful optimistic fallback
                setIsAvailable(true);
                setError(null);
            } finally {
                setIsChecking(false);
            }
        },
        [takenUsernames]
    );

    const debouncedCheck = useDebounce(checkAvailability, 300);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
        setUsername(val);
        setIsAvailable(null);
        setError(null);

        if (val.length >= 3) {
            setIsChecking(true);
            debouncedCheck(val);
        } else {
            setIsChecking(false);
        }
    };

    const handleClaim = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !isAvailable || isChecking || isClaiming) return;

        setIsClaiming(true);
        setError(null);

        try {
            const res = await profileApi.claimUsername(username);
            if (res.success) {
                toast.success('Username claimed successfully!');
                await refreshUser();
                router.push('/dashboard');
            } else {
                setError(res.message || 'Failed to claim username.');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to claim username.');
        } finally {
            setIsClaiming(false);
        }
    };

    const handleSkip = async () => {
        if (isSkipping) return;
        setIsSkipping(true);
        try {
            await skipUsername();
            router.push('/dashboard');
        } catch {
            toast.error('Failed to skip username setup');
        } finally {
            setIsSkipping(false);
        }
    };

    const isValid = username.length >= 3 && username.length <= 20 && isAvailable && !isChecking;

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md bg-card/60 border border-border backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 space-y-6">
                <div className="space-y-2 text-center">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                        Choose your handle
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        This is how others will see you in comments and shares. Usernames cannot be changed once set.
                    </p>
                </div>

                <form onSubmit={handleClaim} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Username
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-lg">
                                @
                            </span>
                            <input
                                type="text"
                                placeholder="your_handle"
                                value={username}
                                onChange={handleTextChange}
                                maxLength={20}
                                disabled={isClaiming}
                                className="w-full bg-background border border-border rounded-2xl py-3 pl-9 pr-12 text-lg font-bold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                                {isChecking && (
                                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                )}
                                {!isChecking && isAvailable === true && (
                                    <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                                {!isChecking && isAvailable === false && (
                                    <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    </div>

                    {error && (
                        <p className="text-xs font-medium text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                            {error}
                        </p>
                    )}

                    <div className="space-y-2 text-xs font-medium text-muted-foreground pl-1">
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${username.length >= 3 && username.length <= 20 ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                            <span>3-20 characters</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${username.length > 0 && /^[a-z0-9_]+$/.test(username) ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                            <span>Lowercase letters, numbers, and underscores</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${isAvailable === true ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                            <span>Unique handle</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!isValid || isClaiming}
                        className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                            isValid
                                ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20'
                                : 'bg-muted text-muted-foreground cursor-not-allowed'
                        }`}
                    >
                        {isClaiming ? (
                            <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Confirm Handle</span>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>

                <div className="text-center pt-2">
                    <button
                        type="button"
                        onClick={handleSkip}
                        disabled={isClaiming || isSkipping}
                        className="text-sm font-semibold text-muted-foreground hover:text-foreground hover:underline transition-all"
                    >
                        {isSkipping ? (
                            <span className="inline-block w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                            'Skip for now'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
