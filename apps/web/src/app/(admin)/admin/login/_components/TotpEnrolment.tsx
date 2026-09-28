'use client';

import { Button } from '@/ui/Button';
import { CopyButton } from '@/ui/CopyButton';
import { Field } from '@/ui/Field';
import { InputOTP } from '@/ui/InputOTP';

/**
 * First-time authenticator enrolment.
 *
 * This was previously rendered inside the TOTP sign-in `<form>`, which nests a
 * form inside a form and makes Enter submit the wrong thing. It is a separate
 * step now, shown in place of the code field once the server says the
 * authenticator is not yet enabled.
 */
export function TotpEnrolment({
    qrCode,
    secret,
    code,
    onCodeChange,
    onVerify,
    onRetry,
    onCancel,
    isLoading,
    needsPasskeyFirst,
}: {
    qrCode: string;
    secret: string;
    code: string;
    onCodeChange: (value: string) => void;
    onVerify: (event: React.FormEvent) => void;
    onRetry: () => void;
    onCancel: () => void;
    isLoading: boolean;
    needsPasskeyFirst: boolean;
}) {
    return (
        <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">Enable your authenticator</h3>
                <p className="text-base text-muted-foreground">
                    An authenticator is required as a second factor for admin sign-in. Scan the code,
                    then enter the six digits it shows.
                </p>
            </div>

            {needsPasskeyFirst || !qrCode ? (
                <div className="space-y-3">
                    <p className="text-base text-muted-foreground">
                        Sign in with your passkey first — that creates the admin session this setup
                        needs — then return here to finish.
                    </p>
                    <Button type="button" size="sm" className="w-full" disabled={isLoading} onClick={onRetry}>
                        {isLoading ? 'Starting setup…' : 'Retry setup'}
                    </Button>
                </div>
            ) : (
                <form onSubmit={onVerify} className="space-y-4">
                    <div className="flex flex-col items-center gap-3">
                        {qrCode ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={qrCode}
                                alt="Authenticator setup QR code"
                                width={176}
                                height={176}
                                className="rounded-lg bg-paper p-2"
                            />
                        ) : null}
                    </div>

                    <Field
                        label="Setup key"
                        description="Enter this in your app if you cannot scan the code."
                        htmlFor="totp-secret"
                    >
                        <div className="flex items-center gap-2">
                            <code
                                id="totp-secret"
                                className="flex-1 select-all break-all rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
                            >
                                {secret}
                            </code>
                            <CopyButton value={secret} />
                        </div>
                    </Field>

                    <Field label="Code from your app" htmlFor="totp-enrol-code">
                        <InputOTP
                            id="totp-enrol-code"
                            value={code}
                            onChange={onCodeChange}
                        />
                    </Field>

                    <div className="flex gap-2">
                        <Button
                            type="submit"
                            disabled={isLoading || code.length !== 6}
                        >
                            {isLoading ? 'Verifying…' : 'Verify and enable'}
                        </Button>
                        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
                            Cancel
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}
