'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { toastError } from '@/lib/utils/error';
import {
    EnvelopeIcon,
    ArrowPathIcon,
    ShieldCheckIcon,
    ChevronLeftIcon,
    KeyIcon
} from '@heroicons/react/24/outline';
import { useAuthFormData } from '@/contexts/AuthFormDataContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { growthApi } from '@/lib/api/client';
import LoadingScreen from '@/components/ui/LoadingScreen';

declare global {
    interface Window {
         
        google: any;
        __ffGoogleGsiInitialized?: boolean;
    }
}

type LoginStep = 'email' | 'otp';

function LoginContent() {
    const { email, setEmail } = useAuthFormData();
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<LoginStep>('email');
    const [isProcessing, setIsProcessing] = useState(false);
    const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);
    const [googleScriptBlocked, setGoogleScriptBlocked] = useState(false);
    const googleInitializedRef = useRef(false);

    const { sendOtp, verifyOtp, loginWithGoogle, user, isLoading } = useAuth();
    const searchParams = useSearchParams();
    const source = searchParams.get('source') || undefined;
    const refCode = searchParams.get('ref') || undefined;
    const redirectParam = searchParams.get('redirect');
    const isInviteFlow = source === 'dashboard_invite' || Boolean(refCode);
    const redirectTarget = useMemo(() => {
        if (!redirectParam || !redirectParam.startsWith('/') || redirectParam.startsWith('//')) {
            return '/dashboard';
        }
        if (redirectParam === '/login' || redirectParam.startsWith('/login?')) {
            return '/dashboard';
        }
        return redirectParam;
    }, [redirectParam]);
    const trackingSource = useMemo(() => {
        if (!source && !refCode) return undefined;
        if (source && refCode) return `${source}|ref:${refCode}`;
        return source || `ref:${refCode}`;
    }, [source, refCode]);

    const navigateAfterLogin = useCallback(() => {
        window.location.replace(redirectTarget);
    }, [redirectTarget]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (window.google?.accounts?.id) return;
        const existing = document.querySelector('script[data-ff-google-gsi="1"]');
        if (existing) return;
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.ffGoogleGsi = '1';
        document.head.appendChild(script);
    }, []);

    useEffect(() => {
         
        const isLoggingOut = typeof window !== 'undefined' && (window as any).__isLoggingOut;
        if (user && !isLoading && !isLoggingOut) {
            navigateAfterLogin();
        }
    }, [user, isLoading, navigateAfterLogin]);

    useEffect(() => {
        let retries = 0;
        const maxRetries = 50;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const checkGoogleScript = () => {
            if (typeof window !== 'undefined' && window.google?.accounts?.id) {
                setGoogleScriptLoaded(true);
                setGoogleScriptBlocked(false);
                return;
            }
            retries += 1;
            if (retries >= maxRetries) { setGoogleScriptBlocked(true); return; }
            timeoutId = setTimeout(checkGoogleScript, 100);
        };
        checkGoogleScript();
        return () => { if (timeoutId) clearTimeout(timeoutId); };
    }, []);

     
    const handleGoogleCallback = useCallback(async (response: any) => {
        setIsProcessing(true);
        try {
            await loginWithGoogle(response.credential, trackingSource || source, refCode);
            toast.success('Welcome! Redirecting...');
            navigateAfterLogin();
        } catch (err: unknown) {
            setIsProcessing(false);
            toast.error((err as Error).message || 'Google login failed.');
        }
    }, [loginWithGoogle, navigateAfterLogin, refCode, trackingSource, source]);

    const intent = searchParams.get('intent');
    const isSignupIntent = intent === 'signup' || isInviteFlow;

    useEffect(() => {
        if (process.env.NODE_ENV === 'development') return;
        const trackSource = trackingSource || 'unknown';
        if (isSignupIntent) {
            growthApi.trackEvent('SIGNUP_VIEW', trackSource).catch(() => undefined);
        } else {
            growthApi.trackEvent('LOGIN_VIEW', trackSource).catch(() => undefined);
        }
    }, [trackingSource, isSignupIntent]);

    useEffect(() => {
        if (step !== 'email' || !googleScriptLoaded) return;
        let mounted = true;
        const googleBtnId = 'google-login-btn';
        const initGoogle = () => {
            if (!mounted) return;
            const googleBtn = document.getElementById(googleBtnId);
            if (!googleBtn) { setTimeout(initGoogle, 100); return; }
            try {
                googleBtn.innerHTML = '';
                if (!window.__ffGoogleGsiInitialized && !googleInitializedRef.current) {
                    window.google.accounts.id.initialize({
                        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
                        callback: handleGoogleCallback,
                        auto_select: false,
                    });
                    window.__ffGoogleGsiInitialized = true;
                    googleInitializedRef.current = true;
                }
                const buttonWidth = Math.min(400, googleBtn.clientWidth || 280);
                window.google.accounts.id.renderButton(googleBtn, {
                    type: 'standard', theme: 'outline', size: 'large',
                    text: 'continue_with', shape: 'rectangular',
                    logo_alignment: 'center', width: buttonWidth,
                });
            } catch (err: unknown) {
                console.error('[Google] Render failed:', err);
            }
        };
        const timer = setTimeout(initGoogle, 150);
        return () => { mounted = false; clearTimeout(timer); };
    }, [step, googleScriptLoaded, handleGoogleCallback]);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        const loadingToast = toast.loading('Sending verification code...');
        try {
            await sendOtp(email);
            toast.success('Code sent to your email!', { id: loadingToast });
            setStep('otp');
        } catch (err: unknown) {
            toastError(err, 'Failed to send code.', { id: loadingToast });
        }
    };

    const handleVerifyOtp = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            await verifyOtp(email, otp, trackingSource || source, refCode);
            navigateAfterLogin();
        } catch (err: unknown) {
            setIsProcessing(false);
            toastError(err, 'Invalid or expired code.');
        }
    }, [email, otp, verifyOtp, trackingSource, source, refCode, navigateAfterLogin]);

    if (isProcessing) return <LoadingScreen />;

    return (
        <div className="flex-1 flex flex-col md:flex-row bg-background overflow-hidden relative min-h-[calc(100vh-64px)] md:min-h-[calc(100vh-88px)]">
            {/* Left Side: Hero (Desktop Only) */}
            <div className="hidden md:flex md:w-[45%] lg:w-[50%] bg-muted/30 border-r border-border relative overflow-hidden flex-col items-center justify-center p-12 text-center">
                <div className="space-y-6 max-w-sm animate-in fade-in slide-in-from-left-6 duration-500">
                    <h2 className="text-4xl font-bold tracking-tight text-foreground">
                        Verified opportunities for freshers.
                    </h2>
                    <p className="text-base text-muted-foreground leading-relaxed">
                        Access a verified feed of off-campus jobs, internships, and walk-ins. Direct apply links only.
                    </p>
                </div>
                <div className="absolute -bottom-24 -left-24 h-64 w-64 bg-primary/5 rounded-full blur-3xl" />
            </div>

            {/* Right Side: Login Form */}
            <div className="flex-1 flex flex-col justify-center px-5 py-5 md:px-20 bg-background relative overflow-hidden">
                <div className="max-w-[400px] mx-auto w-full space-y-5 md:space-y-8">
                    <div className="space-y-2 text-center md:text-left">
                        {step !== 'email' && (
                            <button
                                onClick={() => setStep('email')}
                                className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary capitalize tracking-wider mb-4 transition-colors"
                            >
                                <ChevronLeftIcon className="w-3 h-3" />
                                Back to login
                            </button>
                        )}
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                            {step === 'otp' ? 'Verify identity' : isSignupIntent ? 'Create your account' : 'Sign in'}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {step === 'otp' ? `We sent a code to ${email}` : 'Enter your email to access your feed'}
                        </p>
                    </div>

                    {isInviteFlow && step === 'email' && (
                        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                            <p className="text-[11px] font-bold capitalize tracking-widest text-primary">Friend invite</p>
                            <p className="mt-1 text-sm text-foreground">Join from this invite to start with the verified opportunity feed.</p>
                        </div>
                    )}

                    <div className="space-y-5">
                        {step === 'email' && (
                            <form onSubmit={handleSendOtp} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-foreground ml-1">Email Address</label>
                                    <div className="relative group">
                                        <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors z-10" />
                                        <Input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-11 !h-11 text-sm"
                                            placeholder="name@company.com"
                                        />
                                    </div>
                                </div>
                                <Button type="submit" disabled={isLoading || !email} className="w-full !h-11 text-sm font-semibold !rounded-lg">
                                    {isLoading ? <ArrowPathIcon className="w-5 h-5 animate-spin mx-auto" /> : isSignupIntent ? 'Continue to sign up' : 'Continue'}
                                </Button>
                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-border" />
                                    </div>
                                    <div className="relative flex justify-center text-[10px] capitalize tracking-widest font-semibold">
                                        <span className="bg-background px-4 text-muted-foreground/40">or</span>
                                    </div>
                                </div>
                                <div id="google-login-btn" className="w-full min-h-[44px] overflow-hidden rounded-lg flex justify-center" />
                                {googleScriptBlocked && (
                                    <p className="text-[11px] text-muted-foreground text-center">
                                        Google sign-in appears blocked by browser extension/privacy settings. Use email OTP or disable blocking for this site.
                                    </p>
                                )}
                            </form>
                        )}

                        {step === 'otp' && (
                            <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-foreground ml-1">Verification Code</label>
                                    <div className="relative group">
                                        <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors z-10" />
                                        <Input
                                            type="text"
                                            required
                                            maxLength={6}
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                            className="pl-11 !h-11 text-center text-xl font-bold tracking-[0.4em]"
                                            placeholder="000000"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex justify-between items-center px-1">
                                        <p className="text-[11px] text-muted-foreground">Didn&apos;t receive it?</p>
                                        <button type="button" onClick={handleSendOtp} className="text-[11px] font-semibold text-primary hover:underline">
                                            Resend code
                                        </button>
                                    </div>
                                </div>
                                <Button type="submit" disabled={isLoading || otp.length !== 6} className="w-full !h-11 text-sm font-semibold !rounded-lg">
                                    {isLoading ? <ArrowPathIcon className="w-5 h-5 animate-spin mx-auto" /> : 'Verify code'}
                                </Button>
                            </form>
                        )}
                    </div>

                    <div className="pt-8 border-t border-border/50">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground capitalize tracking-widest">
                                <ShieldCheckIcon className="w-4 h-4 text-success/60" />
                                <span>Verified Infrastructure</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-semibold capitalize tracking-widest text-muted-foreground">
                                <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                                <span className="text-muted-foreground/40">|</span>
                                <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginForm() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <LoginContent />
        </Suspense>
    );
}
