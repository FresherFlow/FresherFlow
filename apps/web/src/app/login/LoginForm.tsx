'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { toastError } from '@/lib/utils/error';
import {
    EnvelopeIcon,
    ArrowPathIcon,
    ShieldCheckIcon,
    ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import { useAuthFormData } from '@/lib/auth/AuthFormDataContext';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { growthApi } from '@/lib/api/client';
import LoadingScreen from '@/ui/LoadingScreen';

type LoginStep = 'email' | 'otp';

function LoginContent() {
    const { email, setEmail } = useAuthFormData();
    const [otpArray, setOtpArray] = useState<string[]>(Array(6).fill(''));
    const [step, setStep] = useState<LoginStep>('email');
    const [isProcessing, setIsProcessing] = useState(false);

    const { sendOtp, verifyOtp, loginWithGoogle, user, isLoading } = useAuth();
    const searchParams = useSearchParams();
    const source = searchParams.get('source') || undefined;
    const refCode = searchParams.get('ref') || undefined;
    const redirectParam = searchParams.get('redirect');
    const isInviteFlow = source === 'dashboard_invite' || Boolean(refCode);
    
    const redirectTarget = useMemo(() => {
        if (!redirectParam) return '/dashboard';
        const cleaned = redirectParam.trim();
        if (!cleaned.startsWith('/') || cleaned.startsWith('//')) {
            return '/dashboard';
        }
        if (cleaned === '/login' || cleaned.startsWith('/login?') || cleaned === '/logout' || cleaned.startsWith('/logout?')) {
            return '/dashboard';
        }
        return cleaned;
    }, [redirectParam]);

    const trackingSource = useMemo(() => {
        if (!source && !refCode) return undefined;
        if (source && refCode) return `${source}|ref:${refCode}`;
        return source || `ref:${refCode}`;
    }, [source, refCode]);

    const navigateAfterLogin = useCallback(() => {
        const isLoggingOut = typeof window !== 'undefined' && (window as any).__isLoggingOut;
        if (isLoggingOut) return;
        if (typeof document !== 'undefined') {
            const maxAge = Number(process.env.NEXT_PUBLIC_SESSION_HINT_COOKIE_MAX_AGE_SECONDS || 90 * 24 * 60 * 60);
            const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
            document.cookie = `ff_logged_in=true; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
        }
        window.location.replace(redirectTarget);
    }, [redirectTarget]);

    useEffect(() => {
        const isLoggingOut = typeof window !== 'undefined' && (window as any).__isLoggingOut;
        if (user && !isLoading && !isLoggingOut) {
            navigateAfterLogin();
        }
    }, [user, isLoading, navigateAfterLogin]);

    const handleGoogleSignIn = useCallback(async () => {
        setIsProcessing(true);
        try {
            await loginWithGoogle(trackingSource || source, refCode);
            toast.success('Welcome! Redirecting...');
            navigateAfterLogin();
        } catch (err: unknown) {
            setIsProcessing(false);
            const errMsg = (err as Error).message || '';
            if (!errMsg.includes('auth/popup-closed-by-user') && !errMsg.includes('cancelled-by-user')) {
                toast.error(errMsg || 'Google login failed.');
            }
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

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        const loadingToast = toast.loading('Sending verification code...');
        try {
            await sendOtp(email);
            toast.success('Code sent to your email!', { id: loadingToast });
            setStep('otp');
            setOtpArray(Array(6).fill(''));
        } catch (err: unknown) {
            toastError(err, 'Failed to send code.', { id: loadingToast });
        }
    };

    const submitOtpCode = useCallback(async (code: string) => {
        if (code.length !== 6) return;
        setIsProcessing(true);
        try {
            await verifyOtp(email, code, trackingSource || source, refCode);
            navigateAfterLogin();
        } catch (err: unknown) {
            setIsProcessing(false);
            toastError(err, 'Invalid or expired code.');
        }
    }, [email, verifyOtp, trackingSource, source, refCode, navigateAfterLogin]);

    const handleVerifyOtp = (e: React.FormEvent) => {
        e.preventDefault();
        submitOtpCode(otpArray.join(''));
    };

    const handleOtpChange = (val: string, index: number) => {
        const cleaned = val.replace(/\D/g, '');
        if (!cleaned) return;
        
        const newOtp = [...otpArray];
        newOtp[index] = cleaned.slice(-1);
        setOtpArray(newOtp);
        
        // Auto focus next input
        if (index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement | null;
            nextInput?.focus();
        } else {
            // Trigger auto-submit if it's the last input
            const fullCode = newOtp.join('');
            if (fullCode.length === 6) {
                void submitOtpCode(fullCode);
            }
        }
    };

    const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace') {
            const newOtp = [...otpArray];
            if (!newOtp[index] && index > 0) {
                // Focus previous and clear it
                const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement | null;
                if (prevInput) {
                    prevInput.focus();
                    newOtp[index - 1] = '';
                    setOtpArray(newOtp);
                }
            } else {
                newOtp[index] = '';
                setOtpArray(newOtp);
            }
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pastedData.length === 6) {
            const newOtp = pastedData.split('');
            setOtpArray(newOtp);
            document.getElementById('otp-5')?.focus();
            void submitOtpCode(pastedData);
        }
    };

    if (isProcessing) return <LoadingScreen />;

    return (
        <div className="flex-1 flex flex-col md:flex-row bg-background overflow-hidden relative h-[calc(100vh-64px)] md:h-[calc(100vh-88px)]">
            {/* Left Side: Hero (Desktop Only) */}
            <div className="hidden md:flex md:w-[45%] lg:w-[50%] bg-muted/20 border-r border-border relative overflow-hidden flex-col items-center justify-center p-12 text-center select-none">
                {/* Clean background dot grid pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none dark:opacity-10" />

                <div className="space-y-6 max-w-sm animate-in fade-in slide-in-from-left-6 duration-500 z-10">
                    <h2 className="text-4xl font-bold tracking-tight text-foreground leading-[1.15]">
                        Verified opportunities for freshers.
                    </h2>
                    <p className="text-base text-muted-foreground leading-relaxed">
                        Access a verified feed of off-campus jobs, internships, and walk-ins. Direct apply links only.
                    </p>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="flex-1 flex flex-col justify-center px-5 py-5 md:px-20 bg-background relative overflow-hidden">
                <div className="max-w-[400px] mx-auto w-full space-y-5 md:space-y-8">
                    <div className="space-y-2 text-center md:text-left">
                        {step !== 'email' && (
                            <button
                                onClick={() => setStep('email')}
                                className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary capitalize tracking-wider mb-4 transition-colors cursor-pointer"
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
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleGoogleSignIn}
                                    disabled={isLoading}
                                    className="w-full !h-11 text-sm font-semibold !rounded-lg flex items-center justify-center gap-2 border-border/80 hover:bg-muted/40 transition-colors"
                                >
                                    <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24">
                                        <path
                                            fill="#EA4335"
                                            d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.37 0 3.412 2.667 1.48 6.555l3.786 3.21z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M1.48 6.555A12.049 12.049 0 0 0 0 12c0 1.927.455 3.746 1.258 5.373l3.967-3.07a7.086 7.086 0 0 1-.225-2.303c0-1.442.434-2.776 1.18-3.885L1.48 6.555z"
                                        />
                                        <path
                                            fill="#4285F4"
                                            d="M12 24c3.245 0 5.973-1.076 7.964-2.912l-3.836-2.973c-1.127.755-2.564 1.203-4.128 1.203-3.18 0-5.88-2.154-6.845-5.064L1.258 17.373C3.12 21.294 7.234 24 12 24z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M24 12c0-.864-.077-1.697-.22-2.509H12v4.8h6.732c-.29 1.549-1.164 2.863-2.477 3.745l3.836 2.973C22.336 19.167 24 15.827 24 12z"
                                        />
                                    </svg>
                                    Continue with Google
                                </Button>
                            </form>
                        )}

                        {step === 'otp' && (
                            <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-3">
                                    <label className="text-xs font-medium text-foreground ml-1">Verification Code</label>
                                    
                                    {/* Premium 6-Box OTP Inputs */}
                                    <div className="flex justify-between gap-2.5">
                                        {otpArray.map((digit, idx) => (
                                            <input
                                                key={idx}
                                                id={`otp-${idx}`}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleOtpChange(e.target.value, idx)}
                                                onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                                                onPaste={handleOtpPaste}
                                                className="w-12 h-12 rounded-xl border border-border bg-card text-center text-xl font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
                                                autoFocus={idx === 0}
                                            />
                                        ))}
                                    </div>

                                    <div className="flex justify-between items-center px-1 pt-1">
                                        <p className="text-[11px] text-muted-foreground">Didn&apos;t receive it?</p>
                                        <button type="button" onClick={handleSendOtp} className="text-[11px] font-semibold text-primary hover:underline cursor-pointer">
                                            Resend code
                                        </button>
                                    </div>
                                </div>
                                <Button 
                                    type="submit" 
                                    disabled={isLoading || otpArray.join('').length !== 6} 
                                    className="w-full !h-11 text-sm font-semibold !rounded-lg mt-2"
                                >
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
