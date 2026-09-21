'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { toastError } from '@/lib/utils/error';
import {
    ArrowPathIcon,
    ChevronLeftIcon,
    BriefcaseIcon,
    ChatBubbleLeftRightIcon,
    UsersIcon,
} from '@heroicons/react/24/outline';
import { useAuthFormData } from '@/lib/auth/AuthFormDataContext';
import { Button } from '@/ui/Button';
import { growthApi } from '@/lib/api/client';
import LoadingScreen from '@/features/shell/LoadingScreen';

type LoginStep = 'email' | 'otp';

function LoginContent() {
    const { email } = useAuthFormData();
    const [otpArray, setOtpArray] = useState<string[]>(Array(6).fill(''));
    const [step, setStep] = useState<LoginStep>('email');
    const [isProcessing, setIsProcessing] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const { sendOtp, verifyOtp, loginWithGoogle, user, isLoading } = useAuth();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('expired') === 'true') {
            toast('Your session has expired. Please sign in to continue.', {
                icon: '',
                duration: 6000,
            });
        }
    }, [searchParams]);
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

    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-background relative px-4 py-8 md:py-12" style={{minHeight:'calc(100dvh - 64px)'}}>
            <div className="w-full max-w-4xl md:grid md:grid-cols-2 md:border md:border-border/80 md:rounded-2xl md:shadow-lg md:overflow-hidden animate-in fade-in duration-200">
                {/* Left — creative panel (desktop only) */}
                <aside className="hidden md:flex flex-col justify-between bg-muted/40 text-foreground p-9 relative overflow-hidden border-r border-border/60">
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 pointer-events-none"
                        style={{backgroundImage:'linear-gradient(to right,#4f4f4f2e 1px,transparent 1px),linear-gradient(to bottom,#4f4f4f2e 1px,transparent 1px)',backgroundSize:'22px 22px',maskImage:'radial-gradient(ellipse 80% 80% at 20% 10%,#000 60%,transparent 100%)',WebkitMaskImage:'radial-gradient(ellipse 80% 80% at 20% 10%,#000 60%,transparent 100%)'}}
                    />
                    <div className="relative space-y-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Jobs, powered by freshers.</p>
                        <h2 className="text-3xl font-bold tracking-tight leading-tight">
                            Find jobs. Share opportunities. Help other freshers.
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Off-campus jobs, internships and walk-ins — shared and discussed by freshers like you.
                        </p>
                    </div>
                    <ul className="relative space-y-4 pt-8">
                        <li className="flex items-start gap-3">
                            <BriefcaseIcon className="w-5 h-5 shrink-0 mt-0.5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-semibold">Fresh jobs, daily</p>
                                <p className="text-xs text-muted-foreground">Off-campus roles and walk-ins, updated as the community shares them.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <ChatBubbleLeftRightIcon className="w-5 h-5 shrink-0 mt-0.5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-semibold">Real discussions</p>
                                <p className="text-xs text-muted-foreground">See who applied, interview experiences, and what changed.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <UsersIcon className="w-5 h-5 shrink-0 mt-0.5 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-semibold">Your batch, your filters</p>
                                <p className="text-xs text-muted-foreground">Find what you are eligible for — by batch, role and city.</p>
                            </div>
                        </li>
                    </ul>
                </aside>

                {/* Right — actual login */}
                <div className="w-full flex flex-col justify-center bg-card border border-border/80 shadow-lg rounded-2xl md:border-0 md:shadow-none md:rounded-none p-7 md:p-9 space-y-6">
                {/* Header */}
                <div className="space-y-2 text-center">
                    {step !== 'email' && (
                        <button
                            onClick={() => setStep('email')}
                            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary mb-1 transition-colors cursor-pointer active:scale-95"
                        >
                            <ChevronLeftIcon className="w-3.5 h-3.5" />
                            <span>Back to login options</span>
                        </button>
                    )}
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        {step === 'otp' ? 'Verify security code' : isSignupIntent ? 'Create your account' : 'Sign in to FresherFlow'}
                    </h1>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {step === 'otp' ? `We sent a 6-digit code to ${email}` : 'Find off-campus jobs, internships and walk-in drives'}
                    </p>
                </div>

                {isInviteFlow && step === 'email' && (
                    <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-center">
                        <p className="text-xs font-semibold text-primary">Candidate Referral Invite</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Signing in from this invite unlocks direct feed access.</p>
                    </div>
                )}

                {/* Form Body */}
                <div className="space-y-4">
                    {step === 'email' && (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleGoogleSignIn}
                                disabled={(mounted && isLoading) || isProcessing} size="sm" className="w-full">
                                <span className="flex items-center justify-center gap-2.5">
                                    {isProcessing ? (
                                        <svg className="w-5 h-5 shrink-0 animate-spin text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                            <path
                                                fill="var(--color-destructive)"
                                                d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.37 0 3.412 2.667 1.48 6.555l3.786 3.21z"
                                            />
                                            <path
                                                fill="var(--color-signal-aging)"
                                                d="M1.48 6.555A12.049 12.049 0 0 0 0 12c0 1.927.455 3.746 1.258 5.373l3.967-3.07a7.086 7.086 0 0 1-.225-2.303c0-1.442.434-2.776 1.18-3.885L1.48 6.555z"
                                            />
                                            <path
                                                fill="var(--color-brand-facebook)"
                                                d="M12 24c3.245 0 5.973-1.076 7.964-2.912l-3.836-2.973c-1.127.755-2.564 1.203-4.128 1.203-3.18 0-5.88-2.154-6.845-5.064L1.258 17.373C3.12 21.294 7.234 24 12 24z"
                                            />
                                            <path
                                                fill="var(--color-signal-live)"
                                                d="M24 12c0-.864-.077-1.697-.22-2.509H12v4.8h6.732c-.29 1.549-1.164 2.863-2.477 3.745l3.836 2.973C22.336 19.167 24 15.827 24 12z"
                                            />
                                        </svg>
                                    )}
                                    <span>{isProcessing ? 'Connecting...' : 'Continue with Google'}</span>
                                </span>
                            </Button>

                            {/* EMAIL OTP LOGIN TEMPORARILY DISABLED FOR PROD 
                            <div className="relative py-1">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-border/60" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase tracking-wider font-semibold">
                                    <span className="bg-card px-3 text-muted-foreground/60">or email code</span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="relative group">
                                    <EnvelopeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors z-10" />
                                    <Input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 !h-11 text-xs border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl"
                                        placeholder="name@company.com"
                                    />
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                disabled={isLoading || !email} size="sm" className="w-full">
                                {isLoading ? <ArrowPathIcon className="w-4 h-4 animate-spin mx-auto" /> : isSignupIntent ? 'Continue to Sign Up →' : 'Continue with Email →'}
                            </Button>
                            */}
                        </form>
                    )}

                    {step === 'otp' && (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div className="space-y-2.5">
                                <label className="text-xs font-semibold text-foreground text-center block">6-Digit Verification Code</label>
                                <div className="flex justify-between gap-1.5">
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
                                            className="w-11 h-12 rounded-xl border border-border/80 bg-background text-center text-lg font-bold text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all active:scale-95"
                                            autoFocus={idx === 0}
                                        />
                                    ))}
                                </div>

                                <div className="flex justify-between items-center px-0.5 pt-1">
                                    <p className="text-xs text-muted-foreground">Didn&apos;t receive it?</p>
                                    <button 
                                        type="button" 
                                        onClick={handleSendOtp} 
                                        className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                                    >
                                        Resend code
                                    </button>
                                </div>
                            </div>
                            <Button 
                                type="submit" 
                                disabled={isLoading || otpArray.join('').length !== 6} size="sm" className="w-full">
                                {isLoading ? <ArrowPathIcon className="w-4 h-4 animate-spin mx-auto" /> : 'Verify & Sign In →'}
                            </Button>
                        </form>
                    )}
                </div>

                {/* Footer Security Badge */}
                <div className="pt-4 border-t border-border/50 flex flex-col items-center gap-2 text-center">
                    {/* Removed Verified Infrastructure */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                        <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                        <span className="text-muted-foreground/30">•</span>
                        <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
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
