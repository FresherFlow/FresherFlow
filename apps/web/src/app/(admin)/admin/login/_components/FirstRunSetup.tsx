'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { cn } from '@/ui/cn';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Input } from '@/ui/Input';

/**
 * First-run only: register the very first passkey with the backend bootstrap
 * secret.
 *
 * This used to sit behind a generic "Other Options" toggle on the same footing
 * as a fallback sign-in method, which made a one-time setup task look like a
 * routine login option. It is collapsed by default and named for what it is.
 */
export function FirstRunSetup({
    onSubmit,
    isLoading,
    email,
    onEmailChange,
    showEmailField,
}: {
    /** Receives the entered bootstrap secret — it is never held in the parent. */
    onSubmit: (event: React.FormEvent, bootstrapSecret: string) => void;
    isLoading: boolean;
    email: string;
    onEmailChange: (value: string) => void;
    showEmailField: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [secret, setSecret] = useState('');

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
                First time here? Set up your admin passkey
                <ChevronDownIcon className="size-3.5" />
            </button>
        );
    }

    return (
        <form
            onSubmit={(event) => onSubmit(event, secret)}
            className="space-y-4 rounded-xl border border-dashed border-border p-4"
        >
            <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">Set up your admin passkey</h3>
                <p className="text-sm text-muted-foreground">
                    One-time setup. Enter the backend bootstrap secret to register this device as your
                    passkey. Once registered, sign in from the panel above.
                </p>
            </div>

            {showEmailField ? (
                <Field label="Admin email" htmlFor="setup-email">
                    <Input
                        id="setup-email"
                        type="email"
                        autoComplete="username"
                        placeholder="admin@yourdomain.com"
                        value={email}
                        onChange={(e) => onEmailChange(e.target.value)}
                        variant="form"
                    />
                </Field>
            ) : null}

            <Field label="Bootstrap secret" htmlFor="bootstrap-secret">
                <Input
                    id="bootstrap-secret"
                    type="password"
                    autoComplete="off"
                    placeholder="Enter backend bootstrap secret"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    variant="form"
                />
            </Field>

            <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isLoading} className="w-full">
                    {isLoading ? 'Registering…' : 'Register passkey'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}
