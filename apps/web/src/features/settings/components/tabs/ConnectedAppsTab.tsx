'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/ui/Button';
import { ArrowPathIcon, CpuChipIcon, TrashIcon } from '@heroicons/react/24/outline';

/**
 * Which AI clients are connected to this FresherFlow account, and how to cut
 * them off.
 *
 * A user who connects FresherFlow to ChatGPT or Claude has granted an app the
 * right to act as them, and that grant has to be visible and revocable from the
 * account — otherwise "disconnect" only exists inside the AI client, which is
 * exactly where a user is least able to find it. Revoking here kills the
 * connection's tokens server-side, so the next tool call from that app fails
 * instead of quietly continuing to act.
 *
 * The list comes from GET /oauth/connections (routes/oauth.ts); one row per
 * client, not per token.
 */
type Connection = {
    id: string;
    clientId: string;
    clientName: string | null;
    connectedAt: string;
    lastUsedAt: string | null;
};

function formatWhen(value: string | null): string {
    if (!value) return 'never';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'unknown';
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ConnectedAppsTab() {
    const [connections, setConnections] = useState<Connection[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [revoking, setRevoking] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(null);
        try {
            const data = await apiClient<{ connections: Connection[] }>('/oauth/connections');
            setConnections(data.connections ?? []);
        } catch (err) {
            setConnections(null);
            setError(err instanceof Error ? err.message : 'Could not load your connected apps.');
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const revoke = useCallback(async (connection: Connection) => {
        const name = connection.clientName || 'this app';
        setRevoking(connection.id);
        try {
            await apiClient(`/oauth/connections/${encodeURIComponent(connection.id)}`, { method: 'DELETE' });
            // Drop the row locally rather than refetching: the server already
            // confirmed, and the list is small enough that a visible removal
            // reads better than a spinner over the whole table.
            setConnections((current) => (current ?? []).filter((c) => c.id !== connection.id));
            toast.success(`Disconnected ${name}. It can no longer act as you.`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : `Could not disconnect ${name}.`);
        } finally {
            setRevoking(null);
        }
    }, []);

    return (
        <div className="w-full max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6">
            <div className="border-b border-border/40 pb-4">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                    Connected apps
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                    AI assistants you have connected to your FresherFlow account. Disconnecting stops them
                    from acting as you straight away.
                </p>
            </div>

            {error && (
                <div className="bg-card border border-border/70 rounded-2xl p-5 space-y-3">
                    <p className="text-sm text-foreground">{error}</p>
                    <Button variant="outline" onClick={() => void load()}>
                        Try again
                    </Button>
                </div>
            )}

            {!error && connections === null && (
                <div className="bg-card border border-border/70 rounded-2xl divide-y divide-border/40">
                    {[0, 1].map((row) => (
                        <div key={row} className="flex items-center gap-3 px-5 py-4">
                            <span className="size-9 rounded-xl bg-muted animate-pulse shrink-0" />
                            <span className="flex-1 space-y-2">
                                <span className="block h-3 w-32 rounded bg-muted animate-pulse" />
                                <span className="block h-3 w-48 rounded bg-muted animate-pulse" />
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {!error && connections !== null && connections.length === 0 && (
                <div className="bg-card border border-border/70 rounded-2xl px-5 py-8 text-center">
                    <CpuChipIcon className="size-6 text-muted-foreground mx-auto" aria-hidden="true" />
                    <p className="mt-3 text-sm font-bold text-foreground">No connected apps</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        When you connect FresherFlow to an AI assistant like ChatGPT or Claude, it will
                        appear here so you can disconnect it later.
                    </p>
                </div>
            )}

            {!error && connections !== null && connections.length > 0 && (
                <section className="bg-card border border-border/70 rounded-2xl shadow-xs overflow-hidden">
                    {connections.map((connection, index) => {
                        const name = connection.clientName || 'Unnamed app';
                        const isRevoking = revoking === connection.id;
                        return (
                            <div
                                key={connection.id}
                                className={`flex items-center gap-3 px-5 py-4 ${index > 0 ? 'border-t border-border/40' : ''}`}
                            >
                                <span className="flex size-9 items-center justify-center rounded-xl border border-border bg-muted/50 shrink-0">
                                    <CpuChipIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="text-sm font-bold text-foreground block truncate">{name}</span>
                                    <span className="text-xs text-muted-foreground block truncate">
                                        Connected {formatWhen(connection.connectedAt)} · last used {formatWhen(connection.lastUsedAt)}
                                    </span>
                                </span>
                                {/* The Button primitive owns the secondary-action shape and
                                    focus ring; only the busy label is local. */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void revoke(connection)}
                                    disabled={isRevoking}
                                    className="shrink-0"
                                >
                                    {isRevoking
                                        ? <ArrowPathIcon className="size-3.5 animate-spin" aria-hidden="true" />
                                        : <TrashIcon className="size-3.5" aria-hidden="true" />}
                                    {isRevoking ? 'Disconnecting…' : 'Disconnect'}
                                </Button>
                            </div>
                        );
                    })}
                </section>
            )}

            <p className="text-xs text-muted-foreground">
                Disconnecting takes effect immediately. If you reconnect later, you will be asked to allow
                access again.
            </p>
        </div>
    );
}
