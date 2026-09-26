'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { getErrorMessage, toastError } from '@/lib/utils/error';
import {
    ArrowPathIcon,
    ChevronLeftIcon,
    BriefcaseIcon,
    ChatBubbleLeftRightIcon,
    UsersIcon,
    EnvelopeIcon,
    LockClosedIcon,
} from '@heroicons/react/24/outline';
import type { User } from '@fresherflow/types';
import { useAuthFormData } from '@/lib/auth/AuthFormDataContext';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { growthApi } from '@/lib/api/client';
import { isSafeInternalRedirect } from '@/lib/config/paths';
import LoadingScreen from '@/features/shell/LoadingScreen';
import { profileApi } from '@/lib/api/profile';
import { usernameApi } from '@fresherflow/api-client';
import { AuthShell } from '@/features/auth/components/AuthShell';

type LoginStep = 'email' | 'otp' | 'username';

export type AuthMode = 'auto' | 'signup';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    return useCallback((...args: Parameters<T>) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => callback(...args), delay);
    }, [callback, delay]);
}

function LoginContent({ mode = 'auto' }: { mode?: AuthMode }) {
    const { email, setEmail } = useAuthFormData();
    const [otpArray, setOtpArray] = useState<string[]>(Array(6).fill(''));
    const [step, setStep] = useState<LoginStep>('email');
    const [isProcessing, setIsProcessing] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const { sendOtp, verifyOtp, loginWithGoogle, user, isLoading, refreshUser } = useAuth();
    const searchParams = useSearchParams();

    // username claim state — same as choose-username but inside same shell (no separate page) — mandatory like Twitter, no skip
    const [username, setUsername] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [usernameError, setUsernameError] = useState<string | null>(null);
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimDone, setClaimDone] = useState(false);

    useEffect(() => {
        if (searchParams.get('expired') === 'true') {
            toast('Your session has expired. Please sign in to continue.', {
                id: 'session-expired',
                icon: <LockClosedIcon className="w-5 h-5 text-muted-foreground" />,
                duration: 4000,
            });
        }
    }, [searchParams]);
    const source = searchParams.get('source') || undefined;
    const refCode = searchParams.get('ref') || undefined;
    const redirectParam = searchParams.get('redirect');
    const isInviteFlow = source === 'dashboard_invite' || Boolean(refCode);

    const redirectTarget = useMemo(
        () => (isSafeInternalRedirect(redirectParam) ? (redirectParam as string).trim() : '/jobs?tab=for-you'),
        [redirectParam]
    );

    const trackingSource = useMemo(() => {
        if (!source && !refCode) return undefined;
        if (source && refCode) return `${source}|ref:${refCode}`;
        return source || `ref:${refCode}`;
    }, [source, refCode]);

    const navigatedRef = useRef(false);

    const checkUsername = useCallback(async (val: string) => {
        if (val.length < 3) { setIsAvailable(null); setIsChecking(false); return; }
        try {
            const res = await usernameApi.check(val);
            if (res.reason === 'Authentication required' || res.reason?.includes('Authentication')) {
                setIsAvailable(true); setUsernameError(null);
            } else {
                setIsAvailable(res.available);
                setUsernameError(!res.available ? (res.reason || 'Username already taken') : null);
            }
        } catch { setIsAvailable(true); setUsernameError(null); }
        finally { setIsChecking(false); }
    }, []);
    const debouncedCheck = useDebounce(checkUsername, 300);

    // prefill username claim from ?username=tarun (from /u claim)
    useEffect(() => {
        const prefill = searchParams.get('username');
        if (prefill && !username && (step === 'username' || (!user?.username && user))) {
            const clean = prefill.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
            if (clean.length >= 3) {
                setUsername(clean);
                setIsChecking(true);
                debouncedCheck(clean);
            }
        }
    }, [searchParams, username, debouncedCheck, step, user]);

    // if user already logged in without username, jump to username step inside same UI — mandatory, no skip (Twitter-like)
    useEffect(() => {
        if (!mounted || isLoading || !user) return;
        if (!user.username && step === 'email') {
            const prefill = searchParams.get('username');
            if (prefill) {
                const clean = prefill.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
                if (clean.length >= 3) { setUsername(clean); setIsChecking(true); debouncedCheck(clean); }
            }
            setStep('username');
        }
    }, [mounted, isLoading, user, debouncedCheck, searchParams, step]);

    const navigateAfterLogin = useCallback((authedUser?: User | null) => {
        const isLoggingOut = typeof window !== 'undefined' && (window as any).__isLoggingOut;
        if (isLoggingOut || navigatedRef.current) return;
        const currentUser = authedUser ?? user;
        if (typeof document !== 'undefined') {
            const maxAge = Number(process.env.NEXT_PUBLIC_SESSION_HINT_COOKIE_MAX_AGE_SECONDS || 90 * 24 * 60 * 60);
            const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
            document.cookie = `ff_logged_in=true; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
        }
        // keep claim inside same shell — mandatory like Twitter, no skip, always force username if missing
        if (currentUser && !currentUser.username) {
            const prefill = searchParams.get('username');
            if (prefill) {
                const clean = prefill.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
                if (clean.length >= 3) { setUsername(clean); setIsChecking(true); debouncedCheck(clean); }
            }
            navigatedRef.current = false;
            setStep('username');
            return;
        }
        navigatedRef.current = true;
        window.location.replace(redirectTarget);
    }, [redirectTarget, user, debouncedCheck, searchParams]);

    useEffect(() => {
        const isLoggingOut = typeof window !== 'undefined' && (window as any).__isLoggingOut;
        if (user && !isLoading && !isLoggingOut && step === 'email') {
            // if no username, navigateAfterLogin will switch to username step internally
            navigateAfterLogin();
        }
    }, [user, isLoading, navigateAfterLogin, step]);

    const handleGoogleSignIn = useCallback(async () => {
        setIsProcessing(true);
        try {
            const authedUser = await loginWithGoogle(trackingSource || source, refCode);
            toast.success('Welcome! Redirecting...');
            navigateAfterLogin(authedUser);
        } catch (err: unknown) {
            setIsProcessing(false);
            const errMsg = getErrorMessage(err);
            if (!errMsg.includes('auth/popup-closed-by-user') && !errMsg.includes('cancelled-by-user')) {
                toast.error(getErrorMessage(err, 'Google login failed.'));
            }
        }
    }, [loginWithGoogle, navigateAfterLogin, refCode, trackingSource, source]);

    const isSignupIntent = mode === 'signup' || searchParams.get('intent') === 'signup' || isInviteFlow;

    useEffect(() => {
        if (process.env.NODE_ENV === 'development') return;
        const trackSource = trackingSource || 'unknown';
        if (isSignupIntent) {
            growthApi.trackEvent('SIGNUP_VIEW', trackSource).catch(() => undefined);
        } else {
            growthApi.trackEvent('LOGIN_VIEW', trackSource).catch(() => undefined);
        }
    }, [trackingSource, isSignupIntent]);

    const handleSendOtp = useCallback(async () => {
        const targetEmail = email.trim().toLowerCase();
        if (!EMAIL_PATTERN.test(targetEmail)) {
            toast.error('Enter a valid email address to continue.');
            return;
        }
        if (isProcessing) return;

        setIsProcessing(true);
        const loadingToast = toast.loading(isSignupIntent ? 'Sending your signup code...' : 'Sending verification code...');
        try {
            await sendOtp(targetEmail);
            if (targetEmail !== email) setEmail(targetEmail);
            toast.success('Code sent to your email!', { id: loadingToast });
            setStep('otp');
            setOtpArray(Array(6).fill(''));
        } catch (err: unknown) {
            toastError(err, 'Failed to send code.', { id: loadingToast });
        } finally {
            setIsProcessing(false);
        }
    }, [email, setEmail, sendOtp, isProcessing, isSignupIntent]);

    const submitOtpCode = useCallback(async (code: string) => {
        // OTPs are single-use: ignore re-submits (auto-submit on 6th digit
        // racing the Verify button/Enter) once a verify is in flight.
        if (code.length !== 6 || isProcessing) return;
        setIsProcessing(true);
        try {
            const authedUser = await verifyOtp(email.trim().toLowerCase(), code, trackingSource || source, refCode);
            navigateAfterLogin(authedUser);
        } catch (err: unknown) {
            setIsProcessing(false);
            toastError(err, 'Invalid or expired code.');
        }
    }, [email, verifyOtp, trackingSource, source, refCode, navigateAfterLogin, isProcessing]);

    const handleVerifyOtp = (e: React.FormEvent) => {
        e.preventDefault();
        void submitOtpCode(otpArray.join(''));
    };

    const handleOtpChange = (val: string, index: number) => {
        const cleaned = val.replace(/\D/g, '');
        if (!cleaned) return;
        const newOtp = [...otpArray];
        newOtp[index] = cleaned.slice(-1);
        setOtpArray(newOtp);
        if (index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement | null;
            nextInput?.focus();
        } else {
            const fullCode = newOtp.join('');
            if (fullCode.length === 6) void submitOtpCode(fullCode);
        }
    };

    const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace') {
            const newOtp = [...otpArray];
            if (!newOtp[index] && index > 0) {
                const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement | null;
                if (prevInput) { prevInput.focus(); newOtp[index - 1] = ''; setOtpArray(newOtp); }
            } else { newOtp[index] = ''; setOtpArray(newOtp); }
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

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
        setUsername(val); setIsAvailable(null); setUsernameError(null);
        if (val.length >= 3) { setIsChecking(true); debouncedCheck(val); } else setIsChecking(false);
    };
    const handleClaim = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !isAvailable || isChecking || isClaiming) return;
        setIsClaiming(true); setUsernameError(null);
        try {
            const res = await profileApi.claimUsername(username);
            if (res.success) {
                toast.success('Username claimed!');
                setClaimDone(true);
                // /onboarding boots from fresh server state — never trap the
                // user on this screen if the profile refresh stalls.
                try {
                    await Promise.race([
                        refreshUser(),
                        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('profile refresh timed out')), 6000)),
                    ]);
                } catch {
                    // navigate anyway — the next page loads fresh state
                }
                // username done → onboarding (big left/right, covers all profile) — implemented at /onboarding
                window.location.replace('/onboarding');
            } else setUsernameError(res.message || 'Failed to claim');
        } catch (err: any) { setUsernameError(err.message || 'Failed to claim'); }
        finally { setIsClaiming(false); }
    };
    const isUsernameValid = username.length >= 3 && username.length <= 20 && isAvailable && !isChecking;

    return (
        <AuthShell
            left={
                <>
                    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                        <span className="ff-hero-note ff-pin-in relative shrink-0 self-start">
                            <span aria-hidden className="text-ff-accent">·</span>{' '}
                            {step === 'username' ? (<><b>CLAIM</b> — your public link</>) : (<><b>LIVE</b> — fresher jobs</>)}
                        </span>
                        <div aria-hidden className="pointer-events-none relative min-h-0 flex-1 shrink" />
                        {step === 'username' ? (
                            <>
                                <h2 className="ff-hero-h1 font-display ff-display-h1 font-extrabold">
                                    <span className="line" style={{ animationDelay: '0.05s' }}>
                                        Your public profile,
                                    </span>
                                    <span className="line" style={{ animationDelay: '0.18s' }}>
                                        your <span className="accent">name.</span>
                                    </span>
                                </h2>
                                <p className="ff-hero-sub">
                                    Pick a username — it becomes{' '}
                                    <span className="font-mono font-bold text-foreground">fresherflow.in/u/yourname</span>
                                </p>
                            </>
                        ) : (
                            <>
                                <h2 className="ff-hero-h1 font-display ff-display-h1 font-extrabold">
                                    <span className="line" style={{ animationDelay: '0.05s' }}>
                                        Find jobs.
                                    </span>
                                    <span className="line" style={{ animationDelay: '0.18s' }}>
                                        Help other <span className="accent">freshers.</span>
                                    </span>
                                </h2>
                                <p className="ff-hero-sub">
                                    Off-campus drives, internships and walk-ins across India — shared by the community.
                                </p>
                            </>
                        )}
                        <ul className="relative mt-6 mb-6 shrink-0 space-y-2.5">
                            {[['Free', 'for freshers'], ['Pan-India', 'drives & walk-ins'], ['Community', 'shared by freshers']].map(([value, label]) => (
                                <li key={label} className="flex items-center gap-2.5 text-meta leading-none">
                                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-ff-accent" />
                                    <span className="font-bold text-foreground">{value}</span>
                                    <span className="text-muted-foreground">{label}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="relative mt-auto shrink-0">
                            <div className="ff-hero-meta">
                                <span>
                                    · <b>100% FREE</b> FOR FRESHERS
                                </span>
                                <span>· MADE FOR FRESHERS</span>
                            </div>
                        </div>
                    </div>
                </>
            }
        >
            <div className="m-auto flex w-full ff-form-col flex-col gap-5 lg:ff-form-col-lg">
                <div className="space-y-3">
                    {step !== 'email' && step !== 'username' && (
                        <button onClick={() => { setStep('email'); navigatedRef.current=false; }} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary mb-1 transition-colors cursor-pointer active:scale-95">
                            <ChevronLeftIcon className="w-3.5 h-3.5" /><span>{isSignupIntent ? 'Back to sign up options' : 'Back to sign in options'}</span>
                        </button>
                    )}
                    {step === 'username' && (
                        <button onClick={() => setStep('otp')} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary mb-1 transition-colors cursor-pointer">
                            <ChevronLeftIcon className="w-3.5 h-3.5" /><span>Back</span>
                        </button>
                    )}
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        {step === 'otp' ? 'Verify your email' : step === 'username' ? 'Choose your username' : isSignupIntent ? 'Create your account' : 'Sign in to FresherFlow'}
                    </h1>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {step === 'otp' ? `We sent a 6-digit code to ${email}` : step === 'username' ? 'This is your public link — choose carefully, you can’t change it later.' : isSignupIntent ? 'Free to join. We email you a 6-digit code to confirm your address.' : 'Find off-campus jobs, internships and walk-in drives'}
                    </p>
                </div>

                {isInviteFlow && step === 'email' && (
                    <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-center">
                        <p className="text-xs font-semibold text-primary">Candidate Referral Invite</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Signing in from this invite unlocks direct feed access.</p>
                    </div>
                )}

                <div className="space-y-4">
                    {step === 'email' && (
                        <form onSubmit={(e) => { e.preventDefault(); void handleSendOtp(); }} className="space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="auth-email" className="block pl-1 text-xs font-semibold text-foreground">Email address</label>
                                <div className="relative group">
                                    <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors duration-200 z-10 pointer-events-none" />
                                    <Input id="auth-email" type="email" variant="form" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-11 h-12" placeholder="Enter your email address" />
                                </div>
                            </div>
                            <button type="submit" disabled={(mounted && isLoading) || isProcessing || !email.trim() || !EMAIL_PATTERN.test(email.trim())} className="w-full h-12 rounded-xl bg-ff-accent text-paper font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active-press-soft transition-all disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-100">
                                {isProcessing ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <>Continue <span aria-hidden>→</span></>}
                            </button>
                            <div className="relative py-3"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div><div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">or</span></div></div>
                            <button type="button" onClick={handleGoogleSignIn} disabled={(mounted && isLoading) || isProcessing} className="w-full h-12 rounded-xl border border-border bg-card text-foreground font-medium text-sm flex items-center justify-center gap-2.5 hover:bg-muted active-press-soft transition-all disabled:opacity-50">
                                {isProcessing ? <svg className="w-5 h-5 shrink-0 animate-spin text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24"><path fill="var(--color-brand-google-red)" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.37 0 3.412 2.667 1.48 6.555l3.786 3.21z" /><path fill="var(--color-brand-google-yellow)" d="M1.48 6.555A12.049 12.049 0 0 0 0 12c0 1.927.455 3.746 1.258 5.373l3.967-3.07a7.086 7.086 0 0 1-.225-2.303c0-1.442.434-2.776 1.18-3.885L1.48 6.555z" /><path fill="var(--color-brand-google-blue)" d="M12 24c3.245 0 5.973-1.076 7.964-2.912l-3.836-2.973c-1.127.755-2.564 1.203-4.128 1.203-3.18 0-5.88-2.154-6.845-5.064L1.258 17.373C3.12 21.294 7.234 24 12 24z" /><path fill="var(--color-brand-google-green)" d="M24 12c0-.864-.077-1.697-.22-2.509H12v4.8h6.732c-.29 1.549-1.164 2.863-2.477 3.745l3.836 2.973C22.336 19.167 24 15.827 24 12z" /></svg>}
                                <span>{isProcessing ? 'Connecting...' : 'Google'}</span>
                            </button>
                            {mounted && (() => { try { const last = localStorage.getItem('ff_last_auth_method'); if (last === 'otp') return <p className="text-center text-xs text-muted-foreground">You signed in with email code last time</p>; if (last === 'google') return <p className="text-center text-xs text-muted-foreground">You signed in with Google last time</p>; return null; } catch { return null; }})()}
                        </form>
                    )}
                    {step === 'otp' && (
                        <form onSubmit={handleVerifyOtp} className="space-y-5">
                            <div className="space-y-2.5">
                                <label className="text-xs font-semibold text-foreground block">6-Digit Verification Code</label>
                                <div className="flex justify-between gap-1.5">
                                    {otpArray.map((digit, idx) => (
                                        <input key={idx} id={`otp-${idx}`} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={1} value={digit} onChange={(e) => handleOtpChange(e.target.value, idx)} onKeyDown={(e) => handleOtpKeyDown(e, idx)} onPaste={handleOtpPaste} className="min-w-0 flex-1 h-12 rounded-xl border border-border/80 bg-background text-center text-lg font-bold text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors duration-200" autoFocus={idx === 0} />
                                    ))}
                                </div>
                                <div className="flex justify-between items-center px-0.5 pt-1">
                                    <p className="text-xs text-muted-foreground">Didn&apos;t receive it?</p>
                                    <button type="button" onClick={() => void handleSendOtp()} disabled={isProcessing} className="text-xs font-semibold text-primary hover:underline cursor-pointer disabled:opacity-50">Resend code</button>
                                </div>
                            </div>
                            <Button type="submit" disabled={isLoading || isProcessing || otpArray.join('').length !== 6} size="sm" className="w-full">
                                {isProcessing ? <ArrowPathIcon className="w-4 h-4 animate-spin mx-auto" /> : isSignupIntent ? 'Verify & create account →' : 'Verify & sign in →'}
                            </Button>
                        </form>
                    )}
                    {step === 'username' && (
                        claimDone ? (
                            <div className="ff-pin-in flex flex-col items-center gap-3 py-10 text-center" role="status" aria-live="polite">
                                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
                                    <svg className="h-7 w-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                </span>
                                <p className="font-mono text-lg font-bold text-foreground">@{username}</p>
                                <p className="text-sm font-semibold text-foreground">Username claimed!</p>
                                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden />
                                    Setting up your profile…
                                </p>
                            </div>
                        ) : (
                        <form onSubmit={handleClaim} className="space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="username-input" className="block pl-1 text-xs font-semibold text-foreground">Username</label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm z-10 pointer-events-none">@</span>
                                    <Input id="username-input" type="text" variant="mono" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="your_username" value={username} onChange={handleUsernameChange} maxLength={20} disabled={isClaiming} className="pl-10 pr-10 h-12" />
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center z-10">
                                        {isChecking && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                                        {!isChecking && isAvailable === true && <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                        {!isChecking && isAvailable === false && <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                    </div>
                                </div>
                            </div>
                            {usernameError && <p className="text-xs font-medium text-error bg-error/10 border border-error/20 rounded-xl px-3 py-2">{usernameError}</p>}
                            <div className="space-y-2 text-xs font-medium text-muted-foreground pl-1">
                                <div className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${username.length >= 3 && username.length <= 20 ? 'bg-success' : 'bg-muted-foreground/30'}`} /><span>3-20 characters</span></div>
                                <div className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${username.length > 0 && /^[a-z0-9_]+$/.test(username) ? 'bg-success' : 'bg-muted-foreground/30'}`} /><span>Lowercase letters, numbers, and underscores</span></div>
                                <div className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${isAvailable === true ? 'bg-success' : 'bg-muted-foreground/30'}`} /><span>Unique username</span></div>
                            </div>
                            <Button type="submit" disabled={!isUsernameValid || isClaiming} size="sm" className="w-full">
                                {isClaiming ? <ArrowPathIcon className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm username →'}
                            </Button>
                        </form>
                        )
                    )}
                </div>
                <div className="pt-4 border-t border-border/50 flex flex-col items-center gap-2 text-center">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                        <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                        <span className="text-muted-foreground/30">•</span>
                        <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
                    </div>
                </div>
            </div>
        </AuthShell>
    );
}

export default function LoginForm({ mode = 'auto' }: { mode?: AuthMode }) {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <LoginContent mode={mode} />
        </Suspense>
    );
}
