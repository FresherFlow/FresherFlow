'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogoImage } from '@/features/shell/LogoImage';
import { BriefcaseIcon, ChatBubbleLeftRightIcon, FlagIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import toast from 'react-hot-toast';

import { adminAuthApi, setAdminAccessToken } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/error';
import { Card, CardContent } from '@/ui/Card';
import { PasskeySignIn } from './_components/PasskeySignIn';
import { TotpSignIn } from './_components/TotpSignIn';
import { TotpEnrolment } from './_components/TotpEnrolment';
import { FirstRunSetup } from './_components/FirstRunSetup';

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').toLowerCase();
const adminEmailConfigured = ADMIN_EMAIL.length > 0;

/**
 * Admin sign-in.
 *
 * Passkey and authenticator code are both first-class: the authenticator is a
 * required second factor, so hiding it behind an "Other Options" toggle made a
 * mandatory method look like a fallback. Registering the very first passkey
 * needs a backend bootstrap secret and is genuinely one-time, so it now lives in
 * its own collapsed first-run panel.
 *
 * Moderators do not sign in here at all — they use the normal FresherFlow login
 * and are admitted to /moderation by permission, so that path is a link out.
 */
export default function AdminLoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // TOTP enrolment state. Shown when sign-in 401s with "not enabled";
    // generate/verify sit behind requireAdmin, so a passkey session must exist.
    const [needsEnrolment, setNeedsEnrolment] = useState(false);
    const [enrolQr, setEnrolQr] = useState('');
    const [enrolSecret, setEnrolSecret] = useState('');
    const [enrolCode, setEnrolCode] = useState('');
    const [enrolLoading, setEnrolLoading] = useState(false);
    const [enrolNoSession, setEnrolNoSession] = useState(false);

    const loginCodeRef = useRef<HTMLInputElement | null>(null);
    const [method, setMethod] = useState<'passkey' | 'totp'>('passkey');

    const setAdminSessionHint = useCallback(() => {
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `ff_admin_logged_in=true; path=/; max-age=${90 * 24 * 60 * 60}; SameSite=Lax${secure}`;
    }, []);

    const enterAdmin = useCallback(
        (accessToken?: string) => {
            // The API types the token as optional; without one there is no
            // session to enter, and the old code passed undefined straight into
            // setAdminAccessToken and redirected anyway.
            if (!accessToken) {
                toast.error('Sign-in did not return a session token. Please try again.');
                return;
            }
            setAdminAccessToken(accessToken);
            setAdminSessionHint();
            toast.success('Access granted');
            setTimeout(() => router.push('/admin/dashboard'), 400);
        },
        [router, setAdminSessionHint]
    );

    useEffect(() => {
        if (!adminEmailConfigured) return;
        // Probes connectivity so a broken passkey setup surfaces as a failed
        // action rather than a silent no-op on first click.
        void adminAuthApi
            .getLoginOptions(ADMIN_EMAIL)
            .catch(() => undefined);
    }, []);

    const handleQuickLogin = useCallback(async () => {
        setIsLoading(true);
        try {
            const effectiveEmail = adminEmailConfigured ? ADMIN_EMAIL : email.toLowerCase();
            if (!effectiveEmail) {
                toast.error('Enter your admin email to continue');
                return;
            }
            const options = await adminAuthApi.getLoginOptions(effectiveEmail);

            if ('registrationRequired' in options && options.registrationRequired) {
                toast.error('No passkey on this device. Use the first-time setup below to add one.');
                return;
            }

            const asseResp = await startAuthentication({
                optionsJSON: options as unknown as Parameters<typeof startAuthentication>[0]['optionsJSON'],
            });
            const verification = await adminAuthApi.verifyLogin(effectiveEmail, asseResp);
            if (verification.verified) enterAdmin(verification.accessToken);
        } catch (err: unknown) {
            const error = err as { statusCode?: number; status?: number; message?: string };
            const status = error?.statusCode || error?.status;
            toast.error(
                status === 503 || status === 504
                    ? 'Authentication service or database is unavailable. Please try again later.'
                    : getErrorMessage(error, 'Verification failed.')
            );
        } finally {
            setIsLoading(false);
        }
    }, [email, enterAdmin]);

    const startEnrolment = useCallback(async () => {
        setEnrolLoading(true);
        setEnrolNoSession(false);
        try {
            const data = await adminAuthApi.generateTotp();
            setEnrolQr(data.qrCode);
            setEnrolSecret(data.secret);
            setNeedsEnrolment(true);
        } catch (err: unknown) {
            const error = err as { statusCode?: number; status?: number };
            const status = error?.statusCode ?? error?.status;
            if (status === 401) {
                // totp/generate is behind requireAdmin; Quick Access mints the
                // session, so point there rather than offering a dead retry.
                setNeedsEnrolment(true);
                setEnrolNoSession(true);
                toast.error('Sign in with your passkey first, then enable the authenticator.');
            } else {
                toast.error(getErrorMessage(err, 'Could not start authenticator setup.'));
            }
        } finally {
            setEnrolLoading(false);
        }
    }, []);

    const handleEnrolVerify = useCallback(
        async (event: React.FormEvent) => {
            event.preventDefault();
            if (!/^\d{6}$/.test(enrolCode)) {
                toast.error('Enter the 6-digit code from your authenticator app');
                return;
            }
            setEnrolLoading(true);
            try {
                await adminAuthApi.verifyTotp(enrolCode);
                setNeedsEnrolment(false);
                setEnrolQr('');
                setEnrolSecret('');
                setEnrolCode('');
                setEnrolNoSession(false);
                toast.success('Authenticator enabled — sign in with your code');
                loginCodeRef.current?.focus();
            } catch (err: unknown) {
                toast.error(getErrorMessage(err, 'Invalid verification code.'));
            } finally {
                setEnrolLoading(false);
            }
        },
        [enrolCode]
    );

    const handleTotpLogin = useCallback(
        async (event: React.FormEvent) => {
            event.preventDefault();
            const effectiveEmail = adminEmailConfigured ? ADMIN_EMAIL : email.toLowerCase();
            if (!effectiveEmail) {
                toast.error('Enter your admin email to continue');
                return;
            }
            if (adminEmailConfigured && effectiveEmail !== ADMIN_EMAIL) {
                toast.error('Unauthorized email');
                return;
            }
            if (!/^\d{6}$/.test(totpCode)) {
                toast.error('Enter a valid 6-digit authenticator code');
                return;
            }

            setIsLoading(true);
            try {
                const verification = await adminAuthApi.verifyLoginTotp(effectiveEmail, totpCode);
                if (verification.verified) enterAdmin(verification.accessToken);
            } catch (err: unknown) {
                const error = err as { statusCode?: number; status?: number; message?: string };
                const status = error?.statusCode || error?.status;
                // Not-enrolled is 401 'TOTP login is not enabled for this admin';
                // a wrong code is 400 'Invalid authenticator code'. Only the
                // former routes to enrolment.
                const message = getErrorMessage(error, '').toLowerCase();
                if (status === 401 && message.includes('not enabled')) {
                    toast.error('Authenticator is required for admin sign-in — enable it first.');
                    void startEnrolment();
                    return;
                }
                toast.error(
                    status === 503 || status === 504
                        ? 'Database connection failed. Admin services are temporarily offline.'
                        : getErrorMessage(error, 'Code verification failed.')
                );
            } finally {
                setIsLoading(false);
            }
        },
        [email, enterAdmin, startEnrolment, totpCode]
    );

    const handleRegisterNewPasskey = useCallback(
        async (event: React.FormEvent, bootstrapSecret: string) => {
            event.preventDefault();
            if (!email && !adminEmailConfigured) {
                toast.error('Enter your admin email to register this device');
                return;
            }
            const effectiveEmail = adminEmailConfigured ? ADMIN_EMAIL : email.toLowerCase();
            if (adminEmailConfigured && effectiveEmail !== ADMIN_EMAIL) {
                toast.error('Unauthorized email');
                return;
            }

            setIsLoading(true);
            try {
                const options = await adminAuthApi.getRegistrationOptions(
                    effectiveEmail,
                    bootstrapSecret
                );
                const regResp = await startRegistration({
                    optionsJSON: options as unknown as Parameters<typeof startRegistration>[0]['optionsJSON'],
                });
                const verification = await adminAuthApi.verifyRegistration(effectiveEmail, regResp);
                if (verification.verified) {
                    toast.success('Passkey registered — you can sign in with it now');
                }
            } catch (err: unknown) {
                const error = err as { statusCode?: number; status?: number; message?: string };
                const status = error?.statusCode || error?.status;
                toast.error(
                    status === 503 || status === 504
                        ? 'Infrastructure is currently unavailable. Please check the database status.'
                        : getErrorMessage(error, 'Registration failed.')
                );
            } finally {
                setIsLoading(false);
            }
        },
        [email]
    );

    return (
        <div className="relative grid h-dvh w-full overflow-hidden bg-background text-foreground lg:grid-cols-2">
            {/* Left: sign-in column — internal scroll only if the forms
                outgrow short viewports; the page itself never scrolls. */}
            <div className="flex min-h-0 flex-col items-center justify-center overflow-y-auto px-4 py-6 lg:p-8">
            {/* Layout follows shadcn-admin's sign-in-2: form column plus a
                brand visual panel (right). The old version was a lone centred
                card; methods below are unchanged components. */}
            <div className="w-full max-w-sm space-y-6">
                <div className="flex flex-col items-center gap-3 text-center">
                    <div
                        aria-hidden
                        className="flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10"
                    >
                        <ShieldCheckIcon className="size-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-xl font-medium tracking-tight text-foreground">
                            Admin sign-in
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Use a passkey or an authenticator code.
                        </p>
                    </div>
                </div>

                {needsEnrolment ? (
                    <TotpEnrolment
                        qrCode={enrolQr}
                        secret={enrolSecret}
                        code={enrolCode}
                        onCodeChange={setEnrolCode}
                        onVerify={handleEnrolVerify}
                        onRetry={startEnrolment}
                        onCancel={() => {
                            setNeedsEnrolment(false);
                            setEnrolQr('');
                            setEnrolSecret('');
                            setEnrolCode('');
                            setEnrolNoSession(false);
                        }}
                        isLoading={enrolLoading}
                        needsPasskeyFirst={enrolNoSession}
                    />
                ) : (
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="grid grid-cols-2 gap-1 border-b border-border/60 bg-muted/40 p-1" role="tablist" aria-label="Sign-in method">
                            {(
                                [
                                    { key: 'passkey', label: 'Passkey' },
                                    { key: 'totp', label: 'Authenticator' },
                                ] as const
                            ).map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={method === tab.key}
                                    onClick={() => setMethod(tab.key)}
                                    className={
                                        method === tab.key
                                            ? 'rounded-lg bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm'
                                            : 'rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'
                                    }
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="p-5" role="tabpanel">
                            {method === 'passkey' ? (
                                <PasskeySignIn onSignIn={handleQuickLogin} isLoading={isLoading} />
                            ) : (
                                <TotpSignIn
                                    code={totpCode}
                                    onCodeChange={setTotpCode}
                                    onSubmit={handleTotpLogin}
                                    isLoading={isLoading}
                                    inputRef={loginCodeRef}
                                    showEmailField={!adminEmailConfigured}
                                    email={email}
                                    onEmailChange={setEmail}
                                />
                            )}
                        </div>
                    </div>
                )}

                <FirstRunSetup
                    onSubmit={handleRegisterNewPasskey}
                    isLoading={isLoading}
                    email={email}
                    onEmailChange={setEmail}
                    showEmailField={!adminEmailConfigured}
                />

                {/* Moderators authenticate with their normal FresherFlow account;
                    the admin shell then picks up their review permissions. */}
                <p className="text-center text-sm text-muted-foreground">
                    Moderator?{' '}
                    <Link
                        href="/login?redirect=/admin/dashboard"
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                        Sign in with your FresherFlow account
                    </Link>
                </p>
            </div>
            </div>

            {/* Right: brand visual panel (desktop only) */}
            <div className="relative hidden overflow-hidden bg-logo-bg max-lg:hidden lg:block" aria-hidden>
                <div className="flex h-full flex-col justify-between p-10 text-paper">
                    <div className="flex items-center gap-3">
                        <LogoImage width={32} height={32} className="h-8 w-8 object-contain" />
                        <span className="text-lg font-semibold tracking-wide">FresherFlow</span>
                    </div>
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <p className="text-3xl font-bold tracking-tight">Run the queues.</p>
                            <p className="max-w-sm text-sm text-paper/70">
                                Review listings, triage reports, moderate the community —
                                every action audit-logged.
                            </p>
                        </div>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-3">
                                <BriefcaseIcon className="h-5 w-5 shrink-0 opacity-80" />
                                Listings review and publishing
                            </li>
                            <li className="flex items-center gap-3">
                                <FlagIcon className="h-5 w-5 shrink-0 opacity-80" />
                                Reports triage
                            </li>
                            <li className="flex items-center gap-3">
                                <ChatBubbleLeftRightIcon className="h-5 w-5 shrink-0 opacity-80" />
                                Community moderation
                            </li>
                        </ul>
                    </div>
                    <p className="text-xs text-paper/50">Authorized personnel only. Access attempts are monitored.</p>
                </div>
            </div>
        </div>
    );
}
