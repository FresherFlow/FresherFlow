'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent, FormEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { getErrorMessage } from '@/lib/utils/error';
import { growthApi } from '@/lib/api/client';
import { BrandButton } from '@/ui/BrandButton';
import { Input } from '@/ui/Input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/ui/Dialog';
import { LogoImage } from '@/features/shell/LogoImage';
import type { User } from '@fresherflow/types';

export type AuthModalMode = 'signin' | 'signup';

type AuthStep = 'email' | 'code';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_LENGTH = 6;
const GOOGLE_DISMISSED = ['auth/popup-closed-by-user', 'cancelled-by-user'];
const ANALYTICS_SOURCE = 'auth_modal';
const DEFAULT_INTENT = 'Save jobs, track applications and get alerts for new drives.';

const COPY: Record<AuthModalMode, {
    eyebrow: string;
    title: string;
    submit: string;
    verify: string;
    crossPrefix: string;
    crossAction: string;
}> = {
    signin: {
        eyebrow: 'Continue on FresherFlow',
        title: 'Sign in to continue',
        submit: 'Sign in',
        verify: 'Verify & sign in',
        crossPrefix: 'New here?',
        crossAction: 'Create a profile',
    },
    signup: {
        eyebrow: 'Continue on FresherFlow',
        title: 'Create your profile',
        submit: 'Create profile',
        verify: 'Verify & create account',
        crossPrefix: 'Already have an account?',
        crossAction: 'Sign in',
    },
};

export interface AuthModalProps {
    /** Controlled visibility. Escape and the close button both call `onClose`. */
    isOpen: boolean;
    /** Requested by the close button, Escape, and an overlay click. */
    onClose: () => void;
    /**
     * Fired once per successful authentication, and once if a signed-in user
     * opens the modal. The caller owns everything after this: replay the
     * pending action, refresh state, or navigate. The modal never navigates.
     */
    onAuthenticated: (user: User) => void;
    /** Why the modal opened, e.g. "Sign in to save this job". */
    intent?: string;
    /** Mode the modal opens in. The in-modal cross-link still toggles it. */
    defaultMode?: AuthModalMode;
}

function GoogleMark() {
    return (
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
            <path fill="var(--color-brand-google-red)" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.37 0 3.412 2.667 1.48 6.555l3.786 3.21z" />
            <path fill="var(--color-brand-google-yellow)" d="M1.48 6.555A12.049 12.049 0 0 0 0 12c0 1.927.455 3.746 1.258 5.373l3.967-3.07a7.086 7.086 0 0 1-.225-2.303c0-1.442.434-2.776 1.18-3.885L1.48 6.555z" />
            <path fill="var(--color-brand-google-blue)" d="M12 24c3.245 0 5.973-1.076 7.964-2.912l-3.836-2.973c-1.127.755-2.564 1.203-4.128 1.203-3.18 0-5.88-2.154-6.845-5.064L1.258 17.373C3.12 21.294 7.234 24 12 24z" />
            <path fill="var(--color-brand-google-green)" d="M24 12c0-.864-.077-1.697-.22-2.509H12v4.8h6.732c-.29 1.549-1.164 2.863-2.477 3.745l3.836 2.973C22.336 19.167 24 15.827 24 12z" />
        </svg>
    );
}

function Spinner() {
    return (
        <svg className="h-4 w-4 shrink-0 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

const emptyDigits = () => Array<string>(OTP_LENGTH).fill('');

/**
 * In-page sign-in / sign-up dialog.
 *
 * The same auth the full-page `/login` shell performs, minus the navigation:
 * Google popup and a 6-digit email code, both through `useAuth`. FresherFlow
 * has no password credential, so there is no password field — the code entry
 * is the second step of the same flow rather than a second credential.
 *
 * Radix owns the accessibility contract: `role="dialog"`, `aria-modal`, the
 * focus trap, Escape-to-close and focus restoration on unmount. This component
 * only overrides where focus lands on open, and keeps a label and description
 * wired to the headline so the dialog is announced properly.
 */
export default function AuthModal({
    isOpen,
    onClose,
    onAuthenticated,
    intent = DEFAULT_INTENT,
    defaultMode = 'signin',
}: AuthModalProps) {
    const { sendOtp, verifyOtp, loginWithGoogle, user, isLoading } = useAuth();
    const pathname = usePathname();

    const [mode, setMode] = useState<AuthModalMode>(defaultMode);
    const [step, setStep] = useState<AuthStep>('email');
    const [email, setEmail] = useState('');
    const [digits, setDigits] = useState<string[]>(emptyDigits);
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const emailRef = useRef<HTMLInputElement>(null);
    const digitRefs = useRef<Array<HTMLInputElement | null>>([]);
    // A single-use OTP can be submitted twice: the 6th digit auto-submits
    // while Enter or the verify button is still live. State is stale in that
    // tick, so the in-flight guard is a ref, as in LoginForm.
    const verifyInFlightRef = useRef(false);
    const replayedRef = useRef(false);

    const copy = COPY[mode];
    const busy = isBusy || isLoading;
    const code = digits.join('');

    useEffect(() => {
        setMode(defaultMode);
    }, [defaultMode]);

    // A stale code must never be submitted against a fresh open of the dialog.
    useEffect(() => {
        if (isOpen) return;
        replayedRef.current = false;
        setStep('email');
        setDigits(emptyDigits());
        setError(null);
        setIsBusy(false);
    }, [isOpen]);

    // The action that opened this may have completed elsewhere (a second tab,
    // or a close that raced an in-flight verify). Replay instead of dead-ending.
    useEffect(() => {
        if (!isOpen || !user || replayedRef.current) return;
        replayedRef.current = true;
        onAuthenticated(user);
    }, [isOpen, user, onAuthenticated]);

    useEffect(() => {
        if (!isOpen || process.env.NODE_ENV === 'development') return;
        const event = mode === 'signup' ? 'SIGNUP_VIEW' : 'LOGIN_VIEW';
        growthApi.trackEvent(event, ANALYTICS_SOURCE).catch(() => undefined);
    }, [isOpen, mode]);

    const fullPageHref = useMemo(() => {
        const params = new URLSearchParams();
        if (pathname && pathname !== '/') params.set('redirect', pathname);
        if (mode === 'signup') params.set('intent', 'signup');
        const qs = params.toString();
        return qs ? `/login?${qs}` : '/login';
    }, [mode, pathname]);

    const handleSendOtp = useCallback(async () => {
        const target = email.trim().toLowerCase();
        if (!EMAIL_PATTERN.test(target)) {
            setError('Enter a valid email address to continue.');
            return;
        }
        setIsBusy(true);
        setError(null);
        try {
            await sendOtp(target);
            setEmail(target);
            setDigits(emptyDigits());
            setStep('code');
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to send the code. Try again.'));
        } finally {
            setIsBusy(false);
        }
    }, [email, sendOtp]);

    const handleVerifyOtp = useCallback(async (value: string) => {
        if (value.length !== OTP_LENGTH || verifyInFlightRef.current) return;
        verifyInFlightRef.current = true;
        setIsBusy(true);
        setError(null);
        let authed: User | null = null;
        try {
            authed = await verifyOtp(email.trim().toLowerCase(), value);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'That code is invalid or has expired.'));
            setDigits(emptyDigits());
        } finally {
            verifyInFlightRef.current = false;
            setIsBusy(false);
        }
        if (authed) onAuthenticated(authed);
    }, [email, verifyOtp, onAuthenticated]);

    const handleGoogle = useCallback(async () => {
        if (isBusy) return;
        setIsBusy(true);
        setError(null);
        let authed: User | null = null;
        try {
            authed = await loginWithGoogle();
        } catch (err: unknown) {
            // A dismissed popup is a choice, not a failure worth reporting.
            const message = getErrorMessage(err);
            if (!GOOGLE_DISMISSED.some((token) => message.includes(token))) {
                setError(getErrorMessage(err, 'Google sign-in failed. Try again.'));
            }
        } finally {
            setIsBusy(false);
        }
        if (authed) onAuthenticated(authed);
    }, [isBusy, loginWithGoogle, onAuthenticated]);

    const backToEmail = useCallback(() => {
        setStep('email');
        setDigits(emptyDigits());
        setError(null);
    }, []);

    const switchMode = useCallback(() => {
        setMode((current) => (current === 'signin' ? 'signup' : 'signin'));
        backToEmail();
    }, [backToEmail]);

    const handleDigitChange = useCallback((index: number, value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (!cleaned) return;
        const next = [...digits];
        next[index] = cleaned.slice(-1);
        setDigits(next);
        if (index < OTP_LENGTH - 1) {
            digitRefs.current[index + 1]?.focus();
        } else if (next.every((digit) => digit !== '')) {
            void handleVerifyOtp(next.join(''));
        }
    }, [digits, handleVerifyOtp]);

    const handleDigitKeyDown = useCallback((index: number, key: string) => {
        if (key !== 'Backspace') return;
        const previous = digits[index] ? null : digitRefs.current[index - 1];
        if (!digits[index] && index > 0 && previous) {
            previous.focus();
            setDigits((current) => {
                const next = [...current];
                next[index - 1] = '';
                return next;
            });
            return;
        }
        setDigits((current) => {
            const next = [...current];
            next[index] = '';
            return next;
        });
    }, [digits]);

    const handleDigitPaste = useCallback((event: ClipboardEvent<HTMLInputElement>) => {
        const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
        if (pasted.length !== OTP_LENGTH) return;
        event.preventDefault();
        setDigits(pasted.split(''));
        void handleVerifyOtp(pasted);
    }, [handleVerifyOtp]);

    // Radix would focus the first tabbable element, which is the Google
    // button. The field the user is actually here to fill goes first instead.
    const handleOpenAutoFocus = useCallback((event: Event) => {
        event.preventDefault();
        if (step === 'code') digitRefs.current[0]?.focus();
        else emailRef.current?.focus();
    }, [step]);

    const submitEmail = (event: FormEvent) => {
        event.preventDefault();
        void handleSendOtp();
    };

    const submitCode = (event: FormEvent) => {
        event.preventDefault();
        void handleVerifyOtp(code);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(next) => { if (!next) onClose(); }}>
            <DialogContent className="sm:max-w-md" onOpenAutoFocus={handleOpenAutoFocus}>
                <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-2 pr-8 text-sm font-bold tracking-tight text-foreground">
                        <LogoImage width={20} height={20} className="h-5 w-5 shrink-0" />
                        FresherFlow
                    </div>

                    <DialogHeader>
                        <p className="text-xs font-bold uppercase tracking-widest text-ff-accent">
                            {copy.eyebrow}
                        </p>
                        {/* The reference treatment is a large uppercase headline and
                            DialogTitle owns its own type, so the override sits on a
                            child rather than restyling the primitive at the call site. */}
                        <DialogTitle>
                            <span className="text-2xl font-extrabold uppercase tracking-tight">
                                {step === 'code' ? 'Enter your code' : copy.title}
                            </span>
                        </DialogTitle>
                        <DialogDescription>
                            {step === 'code'
                                ? `We emailed a ${OTP_LENGTH}-digit code to ${email}.`
                                : intent}
                        </DialogDescription>
                    </DialogHeader>

                    {error && (
                        <p
                            role="alert"
                            className="rounded-md border border-error/20 bg-error/10 px-3 py-2 text-xs font-medium text-error"
                        >
                            {error}
                        </p>
                    )}

                    {step === 'email' ? (
                        <form className="flex flex-col gap-4" onSubmit={submitEmail} noValidate>
                            <div className="relative py-1">
                                <div aria-hidden className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-border" />
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="bg-background px-3 text-xs text-muted-foreground">
                                        or continue with
                                    </span>
                                </div>
                            </div>

                            <BrandButton
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => { void handleGoogle(); }}
                                disabled={busy}
                            >
                                {isBusy ? <Spinner /> : <GoogleMark />}
                                Continue with Google
                            </BrandButton>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="auth-modal-email" className="text-xs font-semibold text-foreground">
                                    Email
                                </label>
                                <Input
                                    id="auth-modal-email"
                                    ref={emailRef}
                                    type="email"
                                    variant="form"
                                    required
                                    autoComplete="email"
                                    inputMode="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    className="h-12"
                                />
                            </div>

                            <BrandButton
                                type="submit"
                                variant="solid"
                                className="w-full"
                                disabled={busy || !EMAIL_PATTERN.test(email.trim())}
                            >
                                {copy.submit}
                            </BrandButton>
                        </form>
                    ) : (
                        <form className="flex flex-col gap-4" onSubmit={submitCode} noValidate>
                            <fieldset className="flex flex-col gap-2">
                                <legend className="text-xs font-semibold text-foreground">
                                    6-digit verification code
                                </legend>
                                <div className="flex gap-1.5">
                                    {digits.map((digit, index) => (
                                        <Input
                                            key={index}
                                            id={`auth-modal-otp-${index}`}
                                            ref={(element) => { digitRefs.current[index] = element; }}
                                            variant="otp"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            pattern="[0-9]*"
                                            maxLength={1}
                                            aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
                                            value={digit}
                                            disabled={busy}
                                            onChange={(event) => handleDigitChange(index, event.target.value)}
                                            onKeyDown={(event) => handleDigitKeyDown(index, event.key)}
                                            onPaste={handleDigitPaste}
                                            className="h-12 min-w-0 flex-1"
                                        />
                                    ))}
                                </div>
                            </fieldset>

                            <BrandButton
                                type="submit"
                                variant="solid"
                                className="w-full"
                                disabled={busy || code.length !== OTP_LENGTH}
                            >
                                {isBusy ? <Spinner /> : copy.verify}
                            </BrandButton>

                            <div className="flex items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={backToEmail}
                                    disabled={busy}
                                    className="rounded-sm text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                                >
                                    Use a different email
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { void handleSendOtp(); }}
                                    disabled={busy}
                                    className="rounded-sm text-xs font-semibold text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                                >
                                    Resend code
                                </button>
                            </div>
                        </form>
                    )}

                    <button
                        type="button"
                        onClick={switchMode}
                        className="self-center rounded-sm text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        {copy.crossPrefix}{' '}
                        <span className="font-semibold text-foreground">{copy.crossAction}</span>
                    </button>

                    <div className="border-t border-border pt-4 text-center">
                        <Link
                            href={fullPageHref}
                            className="rounded-sm text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                            Prefer the full page? Continue there
                        </Link>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
