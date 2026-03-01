'use client';

import { useState, useEffect } from 'react';
import { adminAuthApi } from '@/lib/api/client';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import {
    ShieldCheckIcon,
    FingerPrintIcon
} from '@heroicons/react/24/outline';

export default function AdminLoginPage() {
    const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').toLowerCase();
    const adminEmailConfigured = ADMIN_EMAIL.length > 0;
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showOtherOptions, setShowOtherOptions] = useState(false);
    const [totpCode, setTotpCode] = useState('');

    // Check if user has passkeys on mount
    useEffect(() => {
        if (!adminEmailConfigured) return;
        const checkPasskeys = async () => {
            try {
                await adminAuthApi.getLoginOptions(ADMIN_EMAIL);
                // We just call this to check connectivity/existence, result not explicitly used here anymore
            } catch {
                // Ignore error, will handle in actions
            }
        };
        checkPasskeys();
    }, [ADMIN_EMAIL, adminEmailConfigured]);

    const handleRegisterNewPasskey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.error('Enter admin email to register device');
            return;
        }
        if (adminEmailConfigured && email.toLowerCase() !== ADMIN_EMAIL) {
            toast.error('Unauthorized email');
            return;
        }

        setIsLoading(true);
        try {
            const options = await adminAuthApi.getRegistrationOptions(email.toLowerCase());
            const regResp = await startRegistration({ optionsJSON: options as unknown as Parameters<typeof startRegistration>[0]['optionsJSON'] });
            const verification = await adminAuthApi.verifyRegistration(email.toLowerCase(), regResp);

            if (verification.verified) {
                toast.success('Passkey registered! Now use Quick Login to enter.');
                setShowOtherOptions(false);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Registration failed.';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickLogin = async () => {
        setIsLoading(true);
        try {
            const effectiveEmail = adminEmailConfigured ? ADMIN_EMAIL : email.toLowerCase();
            if (!effectiveEmail) {
                toast.error('Enter admin email to continue');
                setShowOtherOptions(true);
                setIsLoading(false);
                return;
            }
            const options = await adminAuthApi.getLoginOptions(effectiveEmail);

            if ('registrationRequired' in options && options.registrationRequired) {
                toast.error('No passkey found. Please use Other Options to create one.');
                setShowOtherOptions(true);
                setIsLoading(false);
                return;
            }

            const asseResp = await startAuthentication({ optionsJSON: options as unknown as Parameters<typeof startAuthentication>[0]['optionsJSON'] });
            const verification = await adminAuthApi.verifyLogin(effectiveEmail, asseResp);

            if (verification.verified) {
                toast.success('Access Granted');
                setTimeout(() => {
                    window.location.href = '/admin/dashboard';
                }, 500);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Verification failed.';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTotpLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const effectiveEmail = adminEmailConfigured ? ADMIN_EMAIL : email.toLowerCase();
        if (!effectiveEmail) {
            toast.error('Enter admin email to continue');
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
            if (verification.verified) {
                toast.success('Access Granted');
                setTimeout(() => {
                    window.location.href = '/admin/dashboard';
                }, 500);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'TOTP verification failed.';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full space-y-8 bg-card border border-border p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20 opacity-50" />

                <div className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                        <ShieldCheckIcon className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight uppercase text-foreground">Admin Portal</h1>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">Passkey or Authenticator</p>
                    {!adminEmailConfigured && (
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest opacity-50">
                            Admin email not configured in client env
                        </p>
                    )}
                </div>

                <div className="space-y-4">
                    {/* Primary Login Card */}
                    <button
                        onClick={handleQuickLogin}
                        disabled={isLoading}
                        className="w-full group relative flex flex-col items-center justify-center p-8 bg-primary text-primary-foreground rounded-2xl border border-primary/20 shadow-xl shadow-primary/10 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <FingerPrintIcon className="w-12 h-12 mb-3 group-hover:scale-110 transition-transform duration-300" />
                        <span className="text-base font-bold uppercase tracking-widest">
                            {isLoading ? 'Verifying...' : 'Quick Access'}
                        </span>
                        <span className="text-[10px] opacity-70 mt-1 font-bold">Touch ID / Face ID / USB key</span>
                    </button>

                    {/* Secondary/Initial Creation */}
                    {showOtherOptions && (
                        <form onSubmit={handleRegisterNewPasskey} className="p-6 bg-muted/30 rounded-2xl border border-border animate-in slide-in-from-top-2 duration-300 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                                    Register New Device
                                </label>
                                <input
                                    type="email"
                                    placeholder={adminEmailConfigured ? ADMIN_EMAIL : 'admin@yourdomain.com'}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-11 text-[10px] font-bold uppercase tracking-widest"
                            >
                                Create Passkey
                            </Button>
                        </form>
                    )}

                    <form onSubmit={handleTotpLogin} className="p-6 bg-muted/30 rounded-2xl border border-border space-y-4">
                        {!adminEmailConfigured && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                                    Admin Email
                                </label>
                                <input
                                    type="email"
                                    placeholder="admin@yourdomain.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                                Authenticator Code
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                placeholder="123456"
                                value={totpCode}
                                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all tracking-[0.2em]"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isLoading || totpCode.length !== 6}
                            className="w-full h-11 text-[10px] font-bold uppercase tracking-widest"
                        >
                            Login with Authenticator
                        </Button>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Alternative path: use authenticator instead of passkey.
                        </p>
                    </form>

                    <button
                        onClick={() => setShowOtherOptions(!showOtherOptions)}
                        className="w-full py-2 text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                        <div className="h-[1px] flex-1 bg-border/50" />
                        <span>{showOtherOptions ? 'Hide Options' : 'Other Options'}</span>
                        <div className="h-[1px] flex-1 bg-border/50" />
                    </button>
                </div>

                <div className="pt-4 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold opacity-40 leading-relaxed">
                        Authorized Personnel Only<br />
                        Access attempts are monitored and logged.
                    </p>
                </div>
            </div>
        </div>
    );
}
