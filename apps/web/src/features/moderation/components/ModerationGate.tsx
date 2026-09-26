'use client';

import Link from 'next/link';
import { useModerationAuth } from '@/features/moderation/moderationAuth';
import { AuthGate } from '@/features/auth/components/ProfileGate';
import { Skeleton } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { Button } from '@/ui/Button';

/**
 * Single gate for /moderation: normal application login + at least one
 * moderation permission. Plain signed-in users see a no-access empty state
 * (never a redirect loop); signed-out users go through the standard login
 * redirect. All moderation pages rely on the layout gate — do not add
 * per-page gates.
 */
export function ModerationGate({ children }: { children: React.ReactNode }) {
    return (
        <AuthGate>
            <ModerationGateInner>{children}</ModerationGateInner>
        </AuthGate>
    );
}

function ModerationGateInner({ children }: { children: React.ReactNode }) {
    const { user, allowed, loading } = useModerationAuth();

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-6xl space-y-2 p-4" aria-hidden="true">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/5" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    if (!allowed) {
        return (
            <div className="mx-auto w-full max-w-6xl px-4 py-6">
                <EmptyState
                    title="Moderator access required"
                    description="Your account does not hold moderation permissions. If you were recently made a moderator, sign out and sign back in, then reopen this page."
                    icon="search"
                    size="md"
                    variant="ghost"
                    action={
                        <Button asChild size="sm">
                            <Link href="/jobs">Back to jobs</Link>
                        </Button>
                    }
                />
            </div>
        );
    }

    return <>{children}</>;
}
