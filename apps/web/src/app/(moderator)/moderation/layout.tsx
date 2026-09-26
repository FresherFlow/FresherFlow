import { ModerationGate } from '@/features/moderation/components/ModerationGate';
import { ModerationNav } from '@/features/moderation/components/ModerationNav';

export default function ModerationLayout({ children }: { children: React.ReactNode }) {
    return (
        <ModerationGate>
            <div className="min-h-screen bg-background text-foreground">
                <header className="border-b border-border bg-card">
                    <div className="mx-auto w-full max-w-6xl px-4 py-4">
                        <h1 className="text-xl font-semibold tracking-tight">Moderation</h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Review queues for community content. Every action is recorded in the audit trail.
                        </p>
                    </div>
                </header>
                <ModerationNav />
                <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
            </div>
        </ModerationGate>
    );
}
