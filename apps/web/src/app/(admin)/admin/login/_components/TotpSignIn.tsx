'use client';

import type { RefObject } from 'react';
import { KeyIcon } from '@heroicons/react/24/outline';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Input } from '@/ui/Input';
import { InputOTP } from '@/ui/InputOTP';

/**
 * Sign in with an authenticator code.
 *
 * The authenticator is a required second factor for admin sign-in, so this is a
 * peer of the passkey panel rather than something behind an "Other Options"
 * toggle. The email field only appears when NEXT_PUBLIC_ADMIN_EMAIL is unset,
 * because otherwise the address is not the visitor's to choose.
 */
export function TotpSignIn({
    code,
    onCodeChange,
    onSubmit,
    isLoading,
    inputRef,
    showEmailField,
    email,
    onEmailChange,
}: {
    code: string;
    onCodeChange: (value: string) => void;
    onSubmit: (event: React.FormEvent) => void;
    isLoading: boolean;
    inputRef: RefObject<HTMLInputElement | null>;
    showEmailField: boolean;
    email: string;
    onEmailChange: (value: string) => void;
}) {
    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-4 text-center">
                <div
                    aria-hidden
                    className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
                >
                    <KeyIcon className="size-7" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-foreground">Use an authenticator code</h2>
                    <p className="text-base text-muted-foreground">
                        Enter the 6-digit code from your authenticator app.
                    </p>
                </div>
            </div>

            {showEmailField ? (
                <Field label="Admin email" htmlFor="admin-email">
                    <Input
                        id="admin-email"
                        type="email"
                        autoComplete="username"
                        placeholder="admin@yourdomain.com"
                        value={email}
                        onChange={(e) => onEmailChange(e.target.value)}
                        variant="form"
                    />
                </Field>
            ) : null}

            <Field label="Authenticator code" htmlFor="totp-code">
                <InputOTP
                    id="totp-code"
                    ref={inputRef}
                    value={code}
                    onChange={onCodeChange}
                />
            </Field>

            <Button type="submit" disabled={isLoading || code.length !== 6} className="w-full">
                {isLoading ? 'Verifying…' : 'Sign in with code'}
            </Button>
        </form>
    );
}
