'use client';

import { FingerPrintIcon } from '@heroicons/react/24/outline';
import { cn } from '@/ui/cn';
import { Button } from '@/ui/Button';

/**
 * Sign in with a passkey. This is one of two first-class admin methods, not a
 * privileged one hiding a fallback — the TOTP panel sits beside it.
 */
export function PasskeySignIn({
    onSignIn,
    isLoading,
}: {
    onSignIn: () => void;
    isLoading: boolean;
}) {
    return (
        <div className="flex flex-col items-center gap-4 text-center">
            <div
                aria-hidden
                className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
                <FingerPrintIcon className="size-7" />
            </div>
            <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground">Use a passkey</h2>
                <p className="text-sm text-muted-foreground">
                    Sign in with Face ID, Touch ID, Windows Hello, or a security key.
                </p>
            </div>
            <Button
                type="button"
                onClick={onSignIn}
                disabled={isLoading}
                className={cn('w-full')}
            >
                {isLoading ? 'Waiting for device…' : 'Sign in with passkey'}
            </Button>
        </div>
    );
}
